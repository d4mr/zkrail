// test/helpers/TestZKRailUPI.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../contracts/rails/ZKRailUPI.sol";

contract TestZKRailUPI is ZKRailUPI {
    function hashIntentSolution(
        IntentSolution calldata solution
    ) external pure returns (bytes32) {
        return _hashIntentSolution(solution);
    }

    function hashIntent(
        Intent calldata intent
    ) external pure returns (bytes32) {
        return _hashIntent(intent);
    }
}
