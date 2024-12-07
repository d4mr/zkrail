pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/rails/ZKRailUPI.sol";
import "@openzeppelin/contracts/utils/Create2.sol";

contract DeployZKRail is Script {
    bytes32 public constant SALT = bytes32(uint256(0x1234));
    // OpenZeppelin's Create2 Deployer address (same on all chains)
    address constant CREATE2_DEPLOYER =
        0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Compute the deployment address
        bytes memory creationCode = type(ZKRailUPI).creationCode;
        address computedAddress = Create2.computeAddress(
            SALT,
            keccak256(creationCode),
            CREATE2_DEPLOYER
        );
        console.log("Computed deployment address:", computedAddress);

        address token = Create2.deploy(0, SALT, creationCode);
        require(token == computedAddress, "Deployment address mismatch");

        vm.stopBroadcast();
    }
}
