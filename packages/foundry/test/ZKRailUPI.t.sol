pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "./helpers/TestZKRailUPI.sol";
import "../contracts/interfaces/IZKRail.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ZKRailUPITest is Test {
    TestZKRailUPI public zkRail;
    MockERC20 public paymentToken;
    MockERC20 public bondToken;

    address maker;
    uint256 makerPrivateKey;
    address taker;

    function setUp() public {
        // Generate maker address and private key
        makerPrivateKey = 0xA11CE; // Example private key
        maker = vm.addr(makerPrivateKey);
        taker = address(0x2);

        // Deploy contracts
        zkRail = new TestZKRailUPI();
        paymentToken = new MockERC20("Payment", "PAY");
        bondToken = new MockERC20("Bond", "BOND");

        // Setup maker and taker with tokens
        paymentToken.mint(taker, 1000e18);
        bondToken.mint(maker, 1000e18);

        vm.label(maker, "Maker");
        vm.label(taker, "Taker");
    }

    function createSignedSolution(
        address _maker,
        address _taker,
        uint256 paymentAmount
    )
        public
        returns (IZKRail.IntentSolution memory solution, bytes memory signature)
    {
        // Create intent
        IZKRail.Intent memory intent = IZKRail.Intent({
            railType: "UPI",
            recipientAddress: "test@upi",
            railAmount: 1000 // 10.00 INR in paise
        });

        // Generate intentId (this would normally come from indexer)
        bytes32 intentId = keccak256(
            abi.encodePacked(
                intent.railType,
                intent.recipientAddress,
                intent.railAmount,
                block.timestamp
            )
        );

        // Create solution
        solution = IZKRail.IntentSolution({
            intentId: intentId,
            intent: intent,
            paymentToken: address(paymentToken),
            paymentAmount: paymentAmount,
            bondToken: address(bondToken),
            bondAmount: 500 * 10 ** 18, // 500 tokens
            intentCreator: _taker
        });

        // Sign solution as maker
        bytes32 structHash = zkRail.hashIntentSolution(solution);
        bytes32 digest = zkRail.DOMAIN_SEPARATOR(); // Note this change too
        digest = keccak256(abi.encodePacked("\x19\x01", digest, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(makerPrivateKey, digest);
        signature = abi.encodePacked(r, s, v);

        return (solution, signature);
    }

    function testHappyPathFlow() public {
        uint256 paymentAmount = 100 * 10 ** 18; // 100 tokens

        // Get initial balances
        uint256 initialTakerPaymentBalance = paymentToken.balanceOf(taker);
        uint256 initialMakerBondBalance = bondToken.balanceOf(maker);

        // Create and sign solution as maker
        (
            IZKRail.IntentSolution memory solution,
            bytes memory signature
        ) = createSignedSolution(maker, taker, paymentAmount);

        // Approve tokens
        vm.startPrank(taker);
        paymentToken.approve(address(zkRail), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(maker);
        bondToken.approve(address(zkRail), type(uint256).max);
        vm.stopPrank();

        // Commit to solution as taker
        vm.startPrank(taker);
        zkRail.commitToSolution(solution, signature);
        vm.stopPrank();

        // Check balances after commitment
        uint256 requiredTakerAmount = zkRail.calculateTotalAmount(
            paymentAmount
        );
        assertEq(
            paymentToken.balanceOf(taker),
            initialTakerPaymentBalance - requiredTakerAmount,
            "Incorrect taker payment deduction"
        );
        assertEq(
            bondToken.balanceOf(maker),
            initialMakerBondBalance - solution.bondAmount,
            "Incorrect maker bond deduction"
        );

        // Settle as taker
        vm.startPrank(taker);
        zkRail.settle(solution.intentId);
        vm.stopPrank();

        // Check final balances
        // Taker should get collateral back (50% of payment)
        uint256 collateralAmount = (paymentAmount * 50) / 100;
        assertEq(
            paymentToken.balanceOf(taker),
            initialTakerPaymentBalance - paymentAmount,
            "Incorrect final taker balance"
        );

        // Maker should get bond back
        assertEq(
            bondToken.balanceOf(maker),
            initialMakerBondBalance,
            "Maker should get full bond back"
        );
    }
}
