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

    // EIP-712 type hashes
    bytes32 public constant INTENT_TYPEHASH =
        keccak256(
            "Intent(string railType,string recipientAddress,uint256 railAmount)"
        );

    bytes32 public constant INTENT_SOLUTION_TYPEHASH =
        keccak256(
            "IntentSolution(bytes32 intentId,Intent intent,address paymentToken,uint256 paymentAmount,address bondToken,uint256 bondAmount,address intentCreator)Intent(string railType,string recipientAddress,uint256 railAmount)"
        );

    // Storage
    mapping(bytes32 => IntentSolution) public solutions;
    mapping(bytes32 => bool) public isSettled;
    mapping(bytes32 => uint256) public commitTimes;
    mapping(bytes32 => address) public intentMakers;

    constructor() EIP712("ZKRail", "1") {}

    /**
     * @notice Hash an intent for EIP-712 signing
     * @param intent The intent to hash
     * @return The EIP-712 compatible hash of the intent
     */
    function _hashIntent(
        Intent calldata intent
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    INTENT_TYPEHASH,
                    keccak256(bytes(intent.railType)),
                    keccak256(bytes(intent.recipientAddress)),
                    intent.railAmount
                )
            );
    }

    /**
     * @notice Hash a complete solution for EIP-712 signing
     * @param solution The solution to hash
     * @return The EIP-712 compatible hash of the solution
     */
    function _hashIntentSolution(
        IntentSolution calldata solution
    ) internal pure returns (bytes32) {
        bytes32 intentHash = _hashIntent(solution.intent);

        return
            keccak256(
                abi.encode(
                    INTENT_SOLUTION_TYPEHASH,
                    solution.intentId,
                    intentHash,
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
     * @return The recovered signer address
     */
    function _verifySolutionSignature(
        IntentSolution calldata solution,
        bytes calldata signature
    ) internal view returns (address) {
        bytes32 digest = _hashTypedDataV4(_hashIntentSolution(solution));
        return ECDSA.recover(digest, signature);
    }

    /**
     * @notice Core implementation of solution commitment
     * @param solution The solution being committed to
     * @param signature The maker's signature
     */
    function commitToSolution(
        IntentSolution calldata solution,
        bytes calldata signature
    ) external virtual {
        // Verify caller is intent creator
        require(
            msg.sender == solution.intentCreator,
            "Only intent creator can commit"
        );
        require(
            commitTimes[solution.intentId] == 0,
            "Intent already committed"
        );

        // Verify signature and get maker address
        address maker = _verifySolutionSignature(solution, signature);
        require(maker != address(0), "Invalid signature");

        // Store maker along with other intent data
        intentMakers[solution.intentId] = maker;

        // Calculate and transfer total amount from taker
        uint256 totalTakerAmount = calculateTotalAmount(solution.paymentAmount);
        ERC20(solution.paymentToken).safeTransferFrom(
            msg.sender,
            address(this),
            totalTakerAmount
        );

        // Transfer bond from maker
        ERC20(solution.bondToken).safeTransferFrom(
            maker,
            address(this),
            solution.bondAmount
        );

        // Store solution details
        solutions[solution.intentId] = solution;
        commitTimes[solution.intentId] = block.timestamp;

        emit IntentSolutionCommitted(
            solution.intentId,
            maker,
            msg.sender,
            solution.intent.railType,
            solution.intent.recipientAddress,
            solution.intent.railAmount,
            solution.paymentToken,
            solution.paymentAmount,
            solution.bondToken,
            solution.bondAmount
        );
    }

    /**
     * @notice Calculate total amount including collateral
     * @param paymentAmount Base payment amount
     * @return Total amount including collateral
     */
    function calculateTotalAmount(
        uint256 paymentAmount
    ) public view returns (uint256) {
        return (paymentAmount * _getCollateralPercentage()) / 100;
    }

    /**
     * @notice Get full intent state
     * @param intentId The intent to query
     */
    function getIntentState(
        bytes32 intentId
    )
        external
        view
        returns (
            IntentSolution memory solution,
            bool _isSettled,
            uint256 commitTime
        )
    {
        return (
            solutions[intentId],
            isSettled[intentId],
            commitTimes[intentId]
        );
    }

    // Abstract functions to be implemented by specific rails
    function _getCollateralPercentage() internal pure virtual returns (uint256);

    function _getProofWindow() internal pure virtual returns (uint256);

    function _getTimeoutWindow() internal pure virtual returns (uint256);

    function _verifyPaymentProof(
        bytes32 intentId,
        bytes calldata proof
    ) internal virtual returns (bool);

    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
