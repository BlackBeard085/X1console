#!/bin/bash
exec solana-validator \
    --identity ~/.config/solana/identity.json \
    --vote-account ~/.config/solana/vote.json \
    --known-validator C58LhVv822GiE3s84pwb58yiaezWLaFFdUtTWDGFySsU \
    --known-validator Abt4r6uhFs7yPwR3jT5qbnLjBtasgHkRVAd1W6H5yonT \
    --only-known-rpc \
    --log /home/ubuntu/validator.log \
    --ledger ./ledger \
    --rpc-port 8899 \
    --dynamic-port-range 8000-8020 \
    --entrypoint xolana.xen.network:8001 \
    --wal-recovery-mode skip_any_corrupted_record \
    --limit-ledger-size 50000000 \
    --enable-rpc-transaction-history \
    --enable-extended-tx-metadata-storage \
    --rpc-pubsub-enable-block-subscription \
    --full-snapshot-interval-slots 5000 \
    --maximum-incremental-snapshots-to-retain 10 \
    --maximum-full-snapshots-to-retain 50 \
