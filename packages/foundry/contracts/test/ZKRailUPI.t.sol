// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../contracts/rails/ZKRailUPI.sol";

contract MockToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ZKRailUPITest is Test {
    ZKRailUPI public zkRail;
    MockToken public paymentToken;
    MockToken public bondToken;

    address public constant MAKER = 0x476C88ED464EFD251a8b18Eb84785F7C46807873;
    address public taker = address(0x2);
    uint256 public makerKey = 0x123; // Private key for maker

    bytes32 public constant INTENT_ID = keccak256("test-intent-1");

    function setUp() public {
        // Deploy contracts
        zkRail = new ZKRailUPI();
        paymentToken = new MockToken("Payment Token", "PAY");
        bondToken = new MockToken("Bond Token", "BOND");

        // Setup test accounts
        vm.deal(MAKER, 100 ether);
        vm.deal(taker, 100 ether);

        // Mint tokens
        paymentToken.mint(taker, 1000 ether);
        bondToken.mint(MAKER, 1000 ether);

        // Approve tokens
        vm.startPrank(taker);
        paymentToken.approve(address(zkRail), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(MAKER);
        bondToken.approve(address(zkRail), type(uint256).max);
        vm.stopPrank();

        // Log addresses for debugging
        console.log("Payment Token address:", address(paymentToken));
        console.log("Bond Token address:", address(bondToken));
        console.log("ZKRail address:", address(zkRail));
    }

    function testHappyPath() public {
        // Create solution
        IZKRail.IntentSolution memory solution = IZKRail.IntentSolution({
            intentId: INTENT_ID,
            railType: "UPI",
            recipientAddress: "maker@upi",
            railAmount: 1000,
            paymentToken: address(paymentToken),
            paymentAmount: 100 ether,
            bondToken: address(bondToken),
            bondAmount: 10 ether,
            intentCreator: taker
        });

        // Sign solution as maker
        bytes32 domainSeparator = zkRail.DOMAIN_SEPARATOR();
        bytes32 typeHash = zkRail.INTENT_SOLUTION_TYPEHASH();

        bytes32 structHash = keccak256(
            abi.encode(
                typeHash,
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

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(makerKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Record initial balances
        uint256 takerPaymentInitial = paymentToken.balanceOf(taker);
        uint256 makerBondInitial = bondToken.balanceOf(MAKER);

        // Step 1: Commit to solution
        vm.prank(taker);
        zkRail.commitToSolution(solution, signature);

        // Verify tokens locked
        uint256 totalPayment = zkRail.calculateTotalAmount(
            solution.paymentAmount
        );
        assertEq(
            paymentToken.balanceOf(taker),
            takerPaymentInitial - totalPayment
        );
        assertEq(
            bondToken.balanceOf(MAKER),
            makerBondInitial - solution.bondAmount
        );
        assertEq(paymentToken.balanceOf(address(zkRail)), totalPayment);
        assertEq(bondToken.balanceOf(address(zkRail)), solution.bondAmount);

        // Step 2: Settle after off-chain payment
        vm.prank(taker);
        zkRail.settle(INTENT_ID);

        // Verify final balances
        uint256 collateral = (solution.paymentAmount * 50) / 100; // 50% collateral returned to taker
        assertEq(
            paymentToken.balanceOf(taker),
            takerPaymentInitial - solution.paymentAmount
        );
        assertEq(bondToken.balanceOf(MAKER), makerBondInitial);

        // Verify settlement state
        (
            IZKRail.IntentSolution memory storedSolution,
            bool isSettled,
            uint256 commitTime
        ) = zkRail.getIntentState(INTENT_ID);

        assertTrue(isSettled);
        assertEq(commitTime > 0, true);
        assertEq(storedSolution.intentId, solution.intentId);
    }

    function testCannotSettleTwice() public {
        // Setup and commit solution
        testHappyPath();

        // Try to settle again
        vm.prank(taker);
        vm.expectRevert(IZKRail.AlreadySettled.selector);
        zkRail.settle(INTENT_ID);
    }
}
