// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IZKRail Interface
 * @notice Interface for ZKRail contracts that enable cross-rail token swaps with payment proofs
 * @dev Each rail (UPI, Bitcoin, etc.) implements this interface with its specific proof verification
 */
interface IZKRail {
    /**
     * @notice Rail-specific payment details
     * @param railType Type of payment rail (e.g., "UPI", "BITCOIN")
     * @param recipientAddress Recipient's address on the rail (e.g., UPI ID, BTC address)
     * @param railAmount Amount in rail's smallest unit (e.g., paise for INR, sats for BTC)
     */
    struct Intent {
        string railType;
        string recipientAddress;
        uint256 railAmount;
    }

    /**
     * @notice Complete solution including intent and token details
     * @param intentId Unique identifier for the intent (generated off-chain)
     * @param intent Rail-specific payment details
     * @param paymentToken Token that maker will receive
     * @param paymentAmount Amount of tokens maker will receive
     * @param bondToken Token used for maker's bond
     * @param bondAmount Amount of tokens maker bonds
     * @param intentCreator Address of the taker who created the intent
     */
    struct IntentSolution {
        bytes32 intentId;
        Intent intent;
        address paymentToken;
        uint256 paymentAmount;
        address bondToken;
        uint256 bondAmount;
        address intentCreator;
    }

    /**
     * @notice Emitted when a solution is committed to an intent
     * @param intentId Unique identifier for the intent
     * @param maker Address that signed the solution
     * @param taker Address that committed to the solution
     * @param railType Type of payment rail
     * @param recipientAddress Recipient's address on the rail
     * @param railAmount Amount in rail's smallest unit
     * @param paymentToken Token maker will receive
     * @param paymentAmount Amount maker will receive
     * @param bondToken Token used for maker's bond
     * @param bondAmount Amount of maker's bond
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
     * @notice Emitted when a payment proof is submitted
     */
    event PaymentProofSubmitted(
        bytes32 indexed intentId,
        address indexed maker
    );

    /**
     * @notice Emitted when a solution is settled normally
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
     * @notice Commit to a solution by locking tokens
     * @param solution The complete solution being committed to
     * @param signature EIP-712 signature from the maker
     * @dev Requires appropriate token approvals for both payment and bond
     */
    function commitToSolution(
        IntentSolution calldata solution,
        bytes calldata signature
    ) external;

    /**
     * @notice Settle a solution after successful off-chain payment
     * @param intentId The intent being settled
     * @dev Only callable by the taker (intent creator)
     */
    function settle(bytes32 intentId) external;

    /**
     * @notice Resolve a solution with a proof of payment
     * @param intentId The intent being resolved
     * @param proof Rail-specific proof of payment
     * @dev Only callable by the maker after proof window and before timeout
     */
    function resolveWithProof(bytes32 intentId, bytes calldata proof) external;

    /**
     * @notice Resolve by timeout if no settlement or proof was submitted
     * @param intentId The intent being resolved
     * @dev Only callable by the taker after timeout window
     */
    function resolveByTimeout(bytes32 intentId) external;

    /**
     * @notice Calculate total amount including collateral
     * @param paymentAmount Base payment amount
     * @return Total amount taker needs to approve (payment + collateral)
     */
    function calculateTotalAmount(
        uint256 paymentAmount
    ) external view returns (uint256);

    /**
     * @notice Get the current state of an intent
     * @param intentId The intent to query
     * @return solution The solution data
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
}
