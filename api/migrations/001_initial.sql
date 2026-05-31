-- FlashRouter Postgres schema, v0.1
--
-- Tables:
--   customers       — accounts / billing identity
--   api_keys        — issued API keys (hashed)
--   api_calls       — every API request (for metering)
--   flash_loans     — every executed flash loan (for billing + analytics)
--   verified_assets — canonical-issuer whitelist (mirrors on-chain)
--   billing_periods — monthly rollups for Stripe

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE customers (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           text UNIQUE NOT NULL,
    name            text,
    company         text,
    tier            text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    stripe_id       text,
    kyb_status      text DEFAULT 'not_required' CHECK (kyb_status IN ('not_required', 'pending', 'verified', 'rejected')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tier            text NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise')),
    name            text NOT NULL,
    key_hash        text UNIQUE NOT NULL,
    key_prefix      text NOT NULL, -- first 8 chars, displayed in UI
    last_used_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    revoked_at      timestamptz
);
CREATE INDEX api_keys_customer_idx ON api_keys (customer_id);
CREATE INDEX api_keys_hash_idx ON api_keys (key_hash);

CREATE TABLE api_calls (
    id              bigserial PRIMARY KEY,
    customer_id     uuid NOT NULL,
    api_key_id      text NOT NULL,
    endpoint        text NOT NULL,
    status_code     int NOT NULL,
    latency_ms      int NOT NULL,
    request_id      text NOT NULL,
    called_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_calls_customer_called_idx ON api_calls (customer_id, called_at DESC);
CREATE INDEX api_calls_endpoint_idx ON api_calls (endpoint);

CREATE TABLE flash_loans (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         uuid NOT NULL REFERENCES customers(id),
    chain               text NOT NULL,
    asset               text NOT NULL,
    amount              numeric(78,0) NOT NULL,
    notional_usd        numeric(20,2) NOT NULL,
    provider            int NOT NULL,
    strategy            text NOT NULL,
    tx_hash             text UNIQUE NOT NULL,
    block_number        bigint NOT NULL,
    profit              numeric(78,0) NOT NULL DEFAULT 0,
    profit_usd          numeric(20,2) NOT NULL DEFAULT 0,
    provider_fee        numeric(78,0) NOT NULL,
    provider_fee_usd    numeric(20,2) NOT NULL,
    platform_fee        numeric(78,0) NOT NULL,
    platform_fee_usd    numeric(20,2) NOT NULL,
    gas_used            bigint NOT NULL,
    gas_usd             numeric(20,2) NOT NULL,
    executed_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX flash_loans_customer_executed_idx ON flash_loans (customer_id, executed_at DESC);
CREATE INDEX flash_loans_chain_idx ON flash_loans (chain);

CREATE TABLE verified_assets (
    chain           text NOT NULL,
    address         text NOT NULL,
    symbol          text NOT NULL,
    name            text NOT NULL,
    decimals        int NOT NULL,
    issuer          text NOT NULL,
    verified_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (chain, address)
);
CREATE INDEX verified_assets_symbol_idx ON verified_assets (chain, symbol);

CREATE TABLE billing_periods (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         uuid NOT NULL REFERENCES customers(id),
    period_start        date NOT NULL,
    period_end          date NOT NULL,
    api_calls           bigint NOT NULL,
    flash_loans         bigint NOT NULL,
    notional_usd        numeric(20,2) NOT NULL,
    platform_fees_usd   numeric(20,2) NOT NULL,
    subscription_usd    numeric(20,2) NOT NULL DEFAULT 0,
    overage_usd         numeric(20,2) NOT NULL DEFAULT 0,
    total_usd           numeric(20,2) NOT NULL,
    invoiced_at         timestamptz,
    paid_at             timestamptz,
    UNIQUE (customer_id, period_start)
);

COMMIT;
