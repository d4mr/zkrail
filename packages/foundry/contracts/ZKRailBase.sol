// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IZKRail} from "./interfaces/IZKRail.sol";

/**
 * @title ZKRailBase
 * @notice Base contract implementing common ZKRail functionality
 * @dev Abstract contract to be inherited by specific rail implementations
 */
abstract contract ZKRailBase is IZKRail, EIP712 {
    using SafeERC20 for ERC20;

    // Single typehash for flattened structure
    bytes32 public constant INTENT_SOLUTION_TYPEHASH =
        keccak256(
            "IntentSolution(bytes32 intentId,string railType,string recipientAddress,uint256 railAmount,address paymentToken,uint256 paymentAmount,address bondToken,uint256 bondAmount,address intentCreator)"
        );

    // Storage slots
    mapping(bytes32 => IntentSolution) internal _solutions;
    mapping(bytes32 => bool) internal _isSettled;
    mapping(bytes32 => uint256) internal _commitTimes;
    mapping(bytes32 => address) internal _intentMakers;

    /**
     * @notice Initialize the base contract
     * @dev Sets up EIP712 domain separator
     */
    constructor() EIP712("ZKRail", "1") {}

    /**
     * @notice Hash an intent solution for EIP-712 signing
     * @param solution The solution to hash
     * @return The EIP-712 compatible hash of the solution
     */
    function _hashIntentSolution(
        IntentSolution calldata solution
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    INTENT_SOLUTION_TYPEHASH,
                    solution.intentId,
                    keccak256(bytes(solution.railType)),
                    keccak256(bytes(solution.recipientAddress)),
                    solution.railAmount,
                    solution.paymentToken,
                    solution.paymentAmount,
                    solution.bondToken,
                    solution.bondAmount,
                    solution.intentCreator
                )
            );
    }

    /**
     * @notice Verify an EIP-712 signature for a solution
     * @param solution The solution being verified
     * @param signature The signature to verify
     * @return signer The recovered signer address
     */
    function _verifySolutionSignature(
        IntentSolution calldata solution,
        bytes calldata signature
    ) internal view returns (address signer) {
        bytes32 digest = _hashTypedDataV4(_hashIntentSolution(solution));
        signer = ECDSA.recover(digest, signature);
        if (signer == address(0)) {
            revert InvalidSignature();
        }
    }

    /**
     * @inheritdoc IZKRail
     */
    function commitToSolution(
        IntentSolution calldata solution,
        bytes calldata signature
    ) external virtual {
        // Validate caller and state
        if (msg.sender != solution.intentCreator) {
            revert UnauthorizedCaller(msg.sender, solution.intentCreator);
        }
        if (_commitTimes[solution.intentId] != 0) {
            revert AlreadyCommitted();
        }

        // Verify signature and get maker
        address maker = _verifySolutionSignature(solution, signature);
        _intentMakers[solution.intentId] = maker;

        // Transfer from taker to contract (needs approval)
        uint256 totalTakerAmount = calculateTotalAmount(solution.paymentAmount);
        ERC20(solution.paymentToken).safeTransferFrom(
            msg.sender,
            address(this),
            totalTakerAmount
        );
        ERC20(solution.bondToken).safeTransferFrom(
            maker,
            address(this),
            solution.bondAmount
        );

        // Update state
        _solutions[solution.intentId] = solution;
        _commitTimes[solution.intentId] = block.timestamp;

        // Emit event
        emit IntentSolutionCommitted(
            solution.intentId,
            maker,
            msg.sender,
            solution.railType,
            solution.recipientAddress,
            solution.railAmount,
            solution.paymentToken,
            solution.paymentAmount,
            solution.bondToken,
            solution.bondAmount
        );
    }

    /**
     * @inheritdoc IZKRail
     */
    function calculateTotalAmount(
        uint256 paymentAmount
    ) public view virtual returns (uint256) {
        return (paymentAmount * _getCollateralPercentage()) / 100;
    }

    /**
     * @inheritdoc IZKRail
     */
    function getIntentState(
        bytes32 intentId
    )
        external
        view
        returns (
            IntentSolution memory solution,
            bool isSettled,
            uint256 commitTime
        )
    {
        return (
            _solutions[intentId],
            _isSettled[intentId],
            _commitTimes[intentId]
        );
    }

    /**
     * @notice Check basic intent validity
     * @param intentId The intent to validate
     * @return maker The maker address if valid
     */
    function _validateIntent(
        bytes32 intentId
    ) internal view returns (address maker) {
        if (_commitTimes[intentId] == 0) {
            revert IntentNotFound();
        }
        if (_isSettled[intentId]) {
            revert AlreadySettled();
        }
        maker = _intentMakers[intentId];
        if (maker == address(0)) {
            revert IntentNotFound();
        }
    }

    /**
     * @notice Check if current time is within valid window
     * @param commitTime Time intent was committed
     * @param window Time window to check
     */
    function _validateTimeWindow(
        uint256 commitTime,
        uint256 window
    ) internal view {
        if (block.timestamp < commitTime + window) {
            revert InvalidTimeWindow(block.timestamp, commitTime + window);
        }
    }

    // Abstract functions to be implemented by specific rails
    function _getCollateralPercentage() internal pure virtual returns (uint256);

    function _getProofWindow() internal pure virtual returns (uint256);

    function _getTimeoutWindow() internal pure virtual returns (uint256);

    function _verifyPaymentProof(
        bytes32 intentId,
        bytes calldata proof
    ) internal virtual returns (bool);

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
