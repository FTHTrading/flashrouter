# Contributing to FlashRouter

Thanks for your interest in contributing. FlashRouter is open infrastructure — improvements from the community make it better for everyone.

## Code of Conduct

By participating, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md). Be kind, be specific, be useful.

## Ways to contribute

| Type | How |
|---|---|
| Bug report | Open an issue with the **Bug report** template. Include repro steps, expected vs. actual behavior, environment. |
| Security issue | **Do not open a public issue.** Email `security@flashrouter.io`. See [SECURITY.md](./SECURITY.md). |
| Feature request | Open an issue with the **Feature request** template. Explain the use case, not just the feature. |
| New provider adapter | See "Adding a new provider" below. |
| New chain | See "Adding a new chain" below. |
| Documentation | Open a PR. Doc improvements are always welcome. |
| Code | Open a PR against `main`. CI must pass. |

## Development setup

```bash
git clone https://github.com/FTHTrading/flashrouter.git
cd flashrouter

# Contracts (requires Foundry)
cd contracts
forge install
forge build
forge test -vvv

# SDK
cd ../sdk
npm install
npm run build
npm test

# API (requires Postgres)
cd ../api
npm install
docker-compose -f ../docker-compose.yml up -d postgres
npm run migrate
npm run dev

# Dashboard
cd ../dashboard
npm install
npm run dev

# Landing
cd ../landing
# Static files — open index.html or `npx serve .`
```

## PR checklist

- [ ] Code compiles and tests pass locally (`forge test`, `npm test`)
- [ ] CI is green on the PR
- [ ] New code has tests (target 80%+ coverage on touched files)
- [ ] Docs updated if behavior changed
- [ ] Smart-contract changes include gas snapshot delta in PR description
- [ ] PR description explains the **why**, not just the what

## Adding a new provider

A "provider" is a flash-loan source (Aave, Balancer, Uniswap, Maker, etc.). To add one:

1. Add the enum value in `contracts/src/interfaces/IFlashRouter.sol`
2. Write an adapter in `contracts/src/adapters/YourProviderAdapter.sol` implementing `IFlashAdapter`
3. Add the adapter to the deploy script in `contracts/script/Deploy.s.sol`
4. Add unit tests using the mock pattern in `contracts/test/`
5. Add the provider to the SDK's `Provider` enum and `PROVIDERS` constant
6. Document the provider in `docs/ARCHITECTURE.md`

## Adding a new chain

1. Add the chain's `IFlashAdapter` provider addresses to a new `script/Deploy.<chain>.s.sol`
2. Add the chain to `sdk/src/constants.ts` `CHAINS` table
3. Add the chain's canonical asset addresses to `VERIFIED_ASSETS`
4. Add chain-specific notes to `docs/DEPLOYMENT.md`
5. Test on testnet, deploy to mainnet after audit signoff

## Solidity style

- Use Solidity 0.8.24+
- SPDX license: `AGPL-3.0` for contracts in `src/`, `MIT` for tests/mocks
- Custom errors over `require` strings (cheaper, more typed)
- NatSpec on every external/public function
- `forge fmt` enforced in CI

## TypeScript style

- ESM only, no CommonJS
- Strict mode
- Prefer `type` over `interface` except when extending
- No `any` — use `unknown` or proper types
- `prettier` defaults

## Commit messages

Conventional Commits format:

```
feat(contracts): add MorphoAdapter
fix(sdk): handle empty quote correctly
docs: update integration guide for Base
chore(ci): bump foundry-toolchain to v1.2
```

## Disclosure

By submitting a contribution, you agree that your work is licensed under the same license as the file you're modifying (AGPL-3.0 for contracts in `src/`, MIT for everything else).
