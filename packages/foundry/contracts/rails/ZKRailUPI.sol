// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ZKRailBase} from "../ZKRailBase.sol";
import {IZKRail} from "../interfaces/IZKRail.sol";

/**
 * @title ZKRailUPI
 * @notice UPI-specific implementation of ZKRail
 * @dev Implements UPI-specific proof verification using ZKFetch bank statement proofs
 */
contract ZKRailUPI is ZKRailBase {
    using SafeERC20 for ERC20;

    // Configuration constants
    uint256 private constant COLLATERAL_PERCENTAGE = 150;
    uint256 private constant PROOF_WINDOW = 5 minutes;
    uint256 private constant TIMEOUT_WINDOW = 48 hours;

    /**
     * @notice Reason codes for why proof submission might fail
     */
    uint8 private constant REASON_NOT_COMMITTED = 1;
    uint8 private constant REASON_ALREADY_SETTLED = 2;
    uint8 private constant REASON_TOO_EARLY = 3;
    uint8 private constant REASON_TOO_LATE = 4;

    /**
     * @inheritdoc ZKRailBase
     */
    function _getCollateralPercentage()
        internal
        pure
        override
        returns (uint256)
    {
        return COLLATERAL_PERCENTAGE;
    }

    /**
     * @inheritdoc ZKRailBase
     */
    function _getProofWindow() internal pure override returns (uint256) {
        return PROOF_WINDOW;
    }

    /**
     * @inheritdoc ZKRailBase
     */
    function _getTimeoutWindow() internal pure override returns (uint256) {
        return TIMEOUT_WINDOW;
    }

    /**
     * @notice Verify UPI payment proof using ZKFetch
     * @param intentId The intent being verified
     * @param proof ZKFetch bank statement proof
     * @return verified Whether the proof is valid
     */
    function _verifyPaymentProof(
        bytes32 intentId,
        bytes calldata proof
    ) internal override returns (bool verified) {
        // TODO: Implement integration with ZKFetch verifier
        // 1. Extract bank statement details from proof
        // 2. Verify proof against ZKFetch verifier contract
        // 3. Verify payment details match intent (amount, recipient UPI)
        // 4. Verify timestamp is within valid window
        return true; // Temporary for testing
    }

    /**
     * @inheritdoc IZKRail
     */
    function resolveWithProof(
        bytes32 intentId,
        bytes calldata proof
    ) external override {
        // Validate basic state
        address maker = _validateIntent(intentId);
        if (msg.sender != maker) {
            revert UnauthorizedCaller(msg.sender, maker);
        }

        // Validate time windows
        uint256 commitTime = _commitTimes[intentId];
        _validateTimeWindow(commitTime, PROOF_WINDOW);
        if (block.timestamp >= commitTime + TIMEOUT_WINDOW) {
            revert InvalidTimeWindow(
                block.timestamp,
                commitTime + TIMEOUT_WINDOW
            );
        }

        // Verify the proof
        if (!_verifyPaymentProof(intentId, proof)) {
            revert InvalidProof();
        }

        IntentSolution storage solution = _solutions[intentId];
        // Transfer all assets to maker
        uint256 totalAmount = calculateTotalAmount(solution.paymentAmount);
        ERC20(solution.paymentToken).safeTransfer(maker, totalAmount);
        ERC20(solution.bondToken).safeTransfer(maker, solution.bondAmount);

        _isSettled[intentId] = true;
        emit PaymentProofSubmitted(intentId, maker);
    }

    /**
     * @inheritdoc IZKRail
     */
    function settle(bytes32 intentId) external override {
        // Validate basic state
        address maker = _validateIntent(intentId);
        IntentSolution storage solution = _solutions[intentId];

        if (msg.sender != solution.intentCreator) {
            revert UnauthorizedCaller(msg.sender, solution.intentCreator);
        }

        // Calculate amounts and transfer
        uint256 collateralAmount = (solution.paymentAmount * 50) / 100;
        // Use transfer instead of safeTransferFrom since we're sending from contract
        // Direct transfer from contract
        ERC20(solution.paymentToken).safeTransfer(
            solution.intentCreator,
            collateralAmount
        );
        ERC20(solution.bondToken).safeTransfer(maker, solution.bondAmount);

        _isSettled[intentId] = true;
        emit SolutionSettled(intentId, msg.sender);
    }

    /**
     * @inheritdoc IZKRail
     */
    function resolveByTimeout(bytes32 intentId) external override {
        // Validate basic state
        _validateIntent(intentId);
        IntentSolution storage solution = _solutions[intentId];

        if (msg.sender != solution.intentCreator) {
            revert UnauthorizedCaller(msg.sender, solution.intentCreator);
        }

        // Validate timeout window
        _validateTimeWindow(_commitTimes[intentId], TIMEOUT_WINDOW);

        // Transfer all assets to taker
        uint256 totalAmount = calculateTotalAmount(solution.paymentAmount);
        ERC20(solution.paymentToken).safeTransfer(
            solution.intentCreator,
            totalAmount
        );
        ERC20(solution.bondToken).safeTransfer(
            solution.intentCreator,
            solution.bondAmount
        );

        _isSettled[intentId] = true;
        emit EmergencyTimeoutTriggered(intentId, msg.sender);
    }

    /**
     * @inheritdoc IZKRail
     */
    function canSubmitProof(
        bytes32 intentId
    ) external view returns (bool canProve, uint8 reasonCode) {
        if (_commitTimes[intentId] == 0) return (false, REASON_NOT_COMMITTED);
        if (_isSettled[intentId]) return (false, REASON_ALREADY_SETTLED);

        uint256 commitTime = _commitTimes[intentId];
        if (block.timestamp < commitTime + PROOF_WINDOW)
            return (false, REASON_TOO_EARLY);
        if (block.timestamp >= commitTime + TIMEOUT_WINDOW)
            return (false, REASON_TOO_LATE);

        return (true, 0);
    }

    /**
     * @inheritdoc IZKRail
     */
    function canTimeout(
        bytes32 intentId
    ) external view returns (bool canTimeout, uint256 remainingTime) {
        if (_commitTimes[intentId] == 0 || _isSettled[intentId]) {
            return (false, 0);
        }

        uint256 timeoutTime = _commitTimes[intentId] + TIMEOUT_WINDOW;
        if (block.timestamp >= timeoutTime) {
            return (true, 0);
        }

        return (false, timeoutTime - block.timestamp);
    }
}
