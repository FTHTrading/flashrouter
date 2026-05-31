.PHONY: help install build test lint clean dev-api dev-dashboard contracts-test contracts-build contracts-deploy docker-up docker-down

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

install: ## Install all workspace dependencies
	npm install
	cd contracts && forge install

build: ## Build SDK + API + dashboard
	npm run build --workspaces --if-present

test: ## Run all tests
	cd contracts && forge test -vv
	npm test --workspaces --if-present

lint: ## Lint everything
	npm run lint --workspaces --if-present
	cd contracts && forge fmt --check

clean: ## Remove build artifacts
	rm -rf */dist */build */out */node_modules contracts/cache contracts/out

dev-api: ## Run the API in dev mode
	npm run dev --workspace=@flashrouter/api

dev-dashboard: ## Run the dashboard in dev mode
	npm run dev --workspace=@flashrouter/dashboard

contracts-test: ## Foundry tests with high verbosity
	cd contracts && forge test -vvv --gas-report

contracts-build: ## Compile contracts
	cd contracts && forge build --sizes

contracts-deploy: ## Deploy to chain specified by RPC_URL env var
	cd contracts && forge script script/Deploy.s.sol --rpc-url $$RPC_URL --broadcast --verify

docker-up: ## Start local Postgres + Redis + API
	docker compose up -d

docker-down: ## Stop local services
	docker compose down
