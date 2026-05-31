// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.24;

interface IERC20Min {
    function transfer(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

/// @title FeeCollector — Per-chain treasury for FlashRouter platform fees
/// @notice Receives the 2 bps platform fee from every flash loan executed
///         through FlashRouter on this chain. Admin (multisig) can sweep
///         to the mainnet treasury via canonical bridges.
contract FeeCollector {
    address public admin;
    address public pendingAdmin;
    address public treasury;

    event Swept(address indexed token, uint256 amount, address indexed to);
    event TreasuryChanged(address indexed old_, address indexed new_);

    modifier onlyAdmin() {
        require(msg.sender == admin, "FC: not admin");
        _;
    }

    constructor(address _admin, address _treasury) {
        require(_admin != address(0) && _treasury != address(0), "FC: zero");
        admin = _admin;
        treasury = _treasury;
    }

    function sweep(address token) external onlyAdmin {
        uint256 bal = IERC20Min(token).balanceOf(address(this));
        require(bal > 0, "FC: nothing");
        require(IERC20Min(token).transfer(treasury, bal), "FC: transfer failed");
        emit Swept(token, bal, treasury);
    }

    function sweepBatch(address[] calldata tokens) external onlyAdmin {
        for (uint256 i = 0; i < tokens.length; ++i) {
            uint256 bal = IERC20Min(tokens[i]).balanceOf(address(this));
            if (bal > 0) {
                require(IERC20Min(tokens[i]).transfer(treasury, bal), "FC: transfer failed");
                emit Swept(tokens[i], bal, treasury);
            }
        }
    }

    function setTreasury(address newTreasury) external onlyAdmin {
        require(newTreasury != address(0), "FC: zero");
        emit TreasuryChanged(treasury, newTreasury);
        treasury = newTreasury;
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        pendingAdmin = newAdmin;
    }

    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "FC: not pending");
        admin = pendingAdmin;
        pendingAdmin = address(0);
    }
}
