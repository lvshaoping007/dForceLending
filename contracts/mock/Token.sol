//SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "../library/ERC20.sol";

contract Token is ERC20 {
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _actualDecimals
    ) public {
        __ERC20_init(_name, _symbol, _actualDecimals);
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) public {
        _burn(account, amount);
    }
}
