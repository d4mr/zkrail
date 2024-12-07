// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ZKRailBase} from "../ZKRailBase.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

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
     * @dev Amount of collateral required as percentage
     * @return Collateral percentage (e.g., 150 for 150%)
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
     * @dev Time window after which maker can submit proof
     * @return Duration in seconds
     */
    function _getProofWindow() internal pure override returns (uint256) {
        return PROOF_WINDOW;
    }

    /**
     * @dev Time window after which taker can claim timeout
     * @return Duration in seconds
     */
    function _getTimeoutWindow() internal pure override returns (uint256) {
        return TIMEOUT_WINDOW;
    }

    /**
     * @notice Verify UPI payment proof using ZKFetch
     * @param intentId The intent being verified
     * @param proof ZKFetch bank statement proof
     * @dev Verifies that the bank statement shows correct payment to recipient
     * @return Whether the proof is valid
     */
    function _verifyPaymentProof(
        bytes32 intentId,
        bytes calldata proof
    ) internal override returns (bool) {
        // TODO: Implement integration with ZKFetch verifier
        // 1. Extract bank statement details from proof
        // 2. Verify proof against ZKFetch verifier contract
        // 3. Verify payment details match intent (amount, recipient UPI)
        // 4. Verify timestamp is within valid window
        return true;
    }

    /**
     * @notice Resolve intent with bank statement proof
     * @param intentId The intent to resolve
     * @param proof ZKFetch bank statement proof
     * @dev Can only be called by maker after proof window and before timeout
     */
    function resolveWithProof(
        bytes32 intentId,
        bytes calldata proof
    ) external override {
        IntentSolution storage solution = solutions[intentId];
        require(commitTimes[intentId] != 0, "Intent not committed");
        require(!isSettled[intentId], "Already settled");

        // Validate time windows
        uint256 commitTime = commitTimes[intentId];
        require(
            block.timestamp >= commitTime + PROOF_WINDOW,
            "Too early for proof"
        );
        require(
            block.timestamp < commitTime + TIMEOUT_WINDOW,
            "Proof window expired"
        );

        // Check caller is the original maker
        address maker = intentMakers[intentId];
        require(maker != address(0), "Intent not committed");
        require(msg.sender == maker, "Only maker can resolve with proof");

        require(_verifyPaymentProof(intentId, proof), "Invalid proof");

        // Transfer all assets to maker
        uint256 totalAmount = calculateTotalAmount(solution.paymentAmount);
        ERC20(solution.paymentToken).safeTransfer(maker, totalAmount);
        ERC20(solution.bondToken).safeTransfer(maker, solution.bondAmount);

        // Update state and emit event
        isSettled[intentId] = true;
        emit PaymentProofSubmitted(intentId, maker);
    }

    /**
     * @notice Settle intent normally
     * @param intentId The intent to settle
     * @dev Called by taker to settle after receiving UPI payment
     */
    function settle(bytes32 intentId) external override {
        IntentSolution storage solution = solutions[intentId];
        require(msg.sender == solution.intentCreator, "Only taker can settle");
        require(!isSettled[intentId], "Already settled");

        address maker = intentMakers[intentId]; // Get stored maker address
        require(maker != address(0), "Intent not committed");

        // Return collateral to taker (50% of payment amount)
        uint256 collateralAmount = (solution.paymentAmount * 50) / 100;
        ERC20(solution.paymentToken).safeTransfer(
            solution.intentCreator,
            collateralAmount
        );

        // Return bond to maker
        ERC20(solution.bondToken).safeTransfer(maker, solution.bondAmount);

        // Update state and emit event
        isSettled[intentId] = true;
        emit SolutionSettled(intentId, msg.sender);
    }

    /**
     * @notice Emergency resolution after timeout
     * @param intentId The intent to resolve
     * @dev Can be called by taker after timeout window to claim all assets
     */
    function resolveByTimeout(bytes32 intentId) external override {
        IntentSolution storage solution = solutions[intentId];
        require(msg.sender == solution.intentCreator, "Only taker can timeout");
        require(!isSettled[intentId], "Already settled");
        require(
            block.timestamp >= commitTimes[intentId] + TIMEOUT_WINDOW,
            "Too early for timeout"
        );

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

        // Update state and emit event
        isSettled[intentId] = true;
        emit EmergencyTimeoutTriggered(intentId, msg.sender);
    }

    /**
     * @notice Check if a solution can be proven
     * @param intentId The intent to check
     * @return canProve Whether proof can be submitted now
     * @return reason Reason code if cannot prove (0 if can prove)
     */
    function canSubmitProof(
        bytes32 intentId
    ) external view returns (bool canProve, uint8 reason) {
        if (commitTimes[intentId] == 0) return (false, 1); // Not committed
        if (isSettled[intentId]) return (false, 2); // Already settled

        uint256 commitTime = commitTimes[intentId];
        if (block.timestamp < commitTime + PROOF_WINDOW) return (false, 3); // Too early
        if (block.timestamp >= commitTime + TIMEOUT_WINDOW) return (false, 4); // Too late

        return (true, 0);
    }

    /**
     * @notice Check if a timeout can be triggered
     * @param intentId The intent to check
     * @return canTimeout Whether timeout can be triggered
     * @return remainingTime Time until timeout can be triggered (0 if ready)
     */
    function canTimeout(
        bytes32 intentId
    ) external view returns (bool canTimeout, uint256 remainingTime) {
        if (commitTimes[intentId] == 0 || isSettled[intentId])
            return (false, 0);

        uint256 timeoutTime = commitTimes[intentId] + TIMEOUT_WINDOW;
        if (block.timestamp >= timeoutTime) return (true, 0);

        return (false, timeoutTime - block.timestamp);
    }
}
