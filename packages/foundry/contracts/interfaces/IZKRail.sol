// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IZKRail
 * @notice Interface for ZKRail contracts that enable cross-rail token swaps with payment proofs
 * @dev Each rail (UPI, Bitcoin, etc.) implements this interface with its specific proof verification
 */
interface IZKRail {
    /**
     * @notice Solution details for an intent including both rail and token details
     * @param intentId Unique identifier for the intent
     * @param railType Type of payment rail (e.g., "UPI", "BITCOIN")
     * @param recipientAddress Recipient's address on the rail (e.g., UPI ID, BTC address)
     * @param railAmount Amount in rail's smallest unit (e.g., paise for INR, sats for BTC)
     * @param paymentToken Token that maker will receive
     * @param paymentAmount Amount of tokens maker will receive
     * @param bondToken Token used for maker's bond
     * @param bondAmount Amount of tokens maker bonds
     * @param intentCreator Address of the taker who created the intent
     */
    struct IntentSolution {
        bytes32 intentId;
        string railType;
        string recipientAddress;
        uint256 railAmount;
        address paymentToken;
        uint256 paymentAmount;
        address bondToken;
        uint256 bondAmount;
        address intentCreator;
    }

    /**
     * @notice Emitted when a solution is committed to with locked tokens
     */
    event IntentSolutionCommitted(
        bytes32 indexed intentId,
        address indexed maker,
        address indexed taker,
        string railType,
        string recipientAddress,
        uint256 railAmount,
        address paymentToken,
        uint256 paymentAmount,
        address bondToken,
        uint256 bondAmount
    );

    /**
     * @notice Emitted when a valid payment proof is submitted
     */
    event PaymentProofSubmitted(
        bytes32 indexed intentId,
        address indexed maker
    );

    /**
     * @notice Emitted when a solution is settled normally by the taker
     */
    event SolutionSettled(bytes32 indexed intentId, address indexed taker);

    /**
     * @notice Emitted when an emergency timeout is triggered
     */
    event EmergencyTimeoutTriggered(
        bytes32 indexed intentId,
        address indexed triggeredBy
    );

    /**
     * @notice Error thrown when operations are attempted on a non-existent intent
     */
    error IntentNotFound();

    /**
     * @notice Error thrown when operations are attempted on an already settled intent
     */
    error AlreadySettled();

    /**
     * @notice Error thrown when an intent has already been committed to
     */
    error AlreadyCommitted();

    /**
     * @notice Error thrown when the caller is not authorized for an operation
     * @param caller Address that attempted the operation
     * @param required Address that is authorized
     */
    error UnauthorizedCaller(address caller, address required);

    /**
     * @notice Error thrown when attempting operations outside their time window
     * @param currentTime Current block timestamp
     * @param requiredTime Required timestamp
     */
    error InvalidTimeWindow(uint256 currentTime, uint256 requiredTime);

    /**
     * @notice Error thrown when a provided signature is invalid
     */
    error InvalidSignature();

    /**
     * @notice Error thrown when a provided payment proof is invalid
     */
    error InvalidProof();

    /**
     * @notice Commit to a solution by locking tokens
     * @param solution Complete solution details
     * @param signature EIP-712 signature from the maker
     */
    function commitToSolution(
        IntentSolution calldata solution,
        bytes calldata signature
    ) external;

    /**
     * @notice Settle a solution after successful off-chain payment
     * @param intentId The intent being settled
     */
    function settle(bytes32 intentId) external;

    /**
     * @notice Resolve a solution with a proof of payment
     * @param intentId The intent being resolved
     * @param proof Rail-specific proof of payment
     */
    function resolveWithProof(bytes32 intentId, bytes calldata proof) external;

    /**
     * @notice Resolve by timeout if no settlement or proof was submitted
     * @param intentId The intent being resolved
     */
    function resolveByTimeout(bytes32 intentId) external;

    /**
     * @notice Calculate total amount including collateral
     * @param paymentAmount Base payment amount
     * @return Total amount including collateral
     */
    function calculateTotalAmount(
        uint256 paymentAmount
    ) external view returns (uint256);

    /**
     * @notice Get the current state of an intent
     * @param intentId The intent to query
     * @return solution The complete solution data
     * @return isSettled Whether the intent is settled
     * @return commitTime When the solution was committed
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
        );

    /**
     * @notice Check if proof submission is currently possible
     * @param intentId The intent to check
     * @return canProve Whether proof can be submitted
     * @return reasonCode Code indicating why proof cannot be submitted (0 if it can)
     */
    function canSubmitProof(
        bytes32 intentId
    ) external view returns (bool canProve, uint8 reasonCode);

    /**
     * @notice Check if timeout resolution is currently possible
     * @param intentId The intent to check
     * @return canTimeout Whether timeout can be triggered
     * @return remainingTime Time until timeout is possible (0 if ready)
     */
    function canTimeout(
        bytes32 intentId
    ) external view returns (bool canTimeout, uint256 remainingTime);
}
