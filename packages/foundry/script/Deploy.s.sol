// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/rails/ZKRailUPI.sol";

contract DeployZKRail is Script {
    function run() external {
        // Retrieve private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy ZKRailUPI
        ZKRailUPI zkRail = new ZKRailUPI();
        
        console.log("ZKRailUPI deployed to:", address(zkRail));

        vm.stopBroadcast();
    }
}