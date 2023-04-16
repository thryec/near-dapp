use near_sdk::{
    borsh::{self, BorshDeserialize, BorshSerialize},
    env,
    json_types::U128,
    near_bindgen, require,
    serde::{Deserialize, Serialize},
    store::*,
    AccountId, BorshStorageKey, PanicOnDefault, Promise,
};
use near_sdk_contract_tools::{event, standard::nep297::Event};

// -------------------- Events -------------------- //

#[event(
    standard = "x-predictions-market",
    version = "0.1.0",
    serde = "near_sdk::serde"
)]
enum ContractEvent {
    MarketCreated {
        market_id: u32,
        owner: AccountId,
    },
    OfferCreated {
        offer_id: u32,
        market_id: u32,
        is_long: bool,
        account_id: AccountId,
        amount: U128,
    },
    OfferAccepted {
        offer_id: u32,
        market_id: u32,
        account_id: AccountId,
    },
    MarketClosed {
        market_id: u32,
    },
    // TODO: Events for credits and withdrawals
    Credits {},
    Withdrawals {},
}

// ------------------- Data Structures ------------------- //

#[derive(BorshSerialize, BorshDeserialize, Debug)]
struct Market {
    id: u32,
    is_open: bool,
    description: String,
    owner: AccountId,
    shares: Vector<SharePair>,
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Debug, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Offer {
    id: u32,
    market_id: u32,
    is_long: bool,
    account_id: AccountId,
    amount: U128,
}

#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct ViewMarket<'a> {
    id: u32,
    is_open: bool,
    description: &'a str,
    owner: &'a AccountId,
    shares: u32,
}

impl<'a> From<&'a Market> for ViewMarket<'a> {
    fn from(v: &'a Market) -> Self {
        Self {
            id: v.id,
            is_open: v.is_open,
            description: &v.description,
            owner: &v.owner,
            shares: v.shares.len(),
        }
    }
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
struct SharePair {
    long: AccountId,
    short: AccountId,
    amount: U128,
}

#[derive(BorshSerialize, BorshDeserialize, PanicOnDefault)]
#[near_bindgen]
pub struct Contract {
    next_offer_id: u32,
    markets: Vector<Market>,
    credit: LookupMap<AccountId, u128>,
    offers: UnorderedMap<u32, Offer>,
}

#[derive(BorshSerialize, BorshStorageKey)]
pub enum StorageKey {
    Markets,
    Offers,
    Credit,
    MarketShares(u32),
}

#[near_bindgen]
impl Contract {
    #[init]
    pub fn new() -> Self {
        Self {
            next_offer_id: 0,
            offers: UnorderedMap::new(StorageKey::Offers),
            credit: LookupMap::new(StorageKey::Credit),
            markets: Vector::new(StorageKey::Markets),
        }
    }

    // ------------------- Mutative Functions ------------------- //

    pub fn create_market(&mut self, description: String) -> ViewMarket {
        let id = self.markets.len();
        let owner = env::predecessor_account_id();

        let m = Market {
            id,
            description,
            owner: owner.clone(),
            is_open: true,
            shares: Vector::new(StorageKey::MarketShares(id)),
        };

        self.markets.push(m);

        ContractEvent::MarketCreated {
            market_id: id,
            owner,
        }
        .emit();

        self.markets.get(id).unwrap().into()
    }

    fn credit_account(&mut self, account_id: AccountId, amount: u128) {
        *self.credit.entry(account_id).or_insert(0) += amount;
    }

    pub fn withdraw(&mut self) -> Promise {
        let predecessor = env::predecessor_account_id();
        let amount = self
            .credit
            .remove(&predecessor)
            .unwrap_or_else(|| env::panic_str("You have no rewards to withdraw."));

        Promise::new(predecessor).transfer(amount)
    }

    pub fn close_market(&mut self, market_id: u32, is_long: bool) {
        let market = self
            .markets
            .get_mut(market_id)
            .unwrap_or_else(|| env::panic_str("Market does not exist!"));
        require!(market.is_open, "Market is already closed.");
        let predecessor = env::predecessor_account_id();
        require!(
            market.owner == predecessor,
            "You are not allowed to close a market you did not create."
        );
        market.is_open = false;

        let credits = market
            .shares
            .iter()
            .map(|s| {
                (
                    if is_long {
                        s.long.clone()
                    } else {
                        s.short.clone()
                    },
                    s.amount,
                )
            })
            .collect::<Vec<_>>();

        ContractEvent::MarketClosed { market_id }.emit();

        drop(market);

        for (creditor, amount) in credits {
            self.credit_account(creditor, amount.0 * 2);
        }
    }

    // ------------------- Payable Functions ------------------- //

    #[payable]
    pub fn create_offer(&mut self, market_id: u32, is_long: bool) -> Offer {
        let amount = env::attached_deposit();
        require!(
            amount > 0,
            "You must attach a nonzero amount to make an offer."
        );

        let id = self.next_offer_id;
        self.next_offer_id += 1;
        let account_id = env::predecessor_account_id();
        let o = Offer {
            id,
            is_long,
            account_id: account_id.clone(),
            amount: amount.into(),
            market_id,
        };

        self.offers.insert(id, o.clone());

        ContractEvent::OfferCreated {
            offer_id: id,
            market_id,
            is_long,
            account_id,
            amount: amount.into(),
        }
        .emit();

        o
    }

    #[payable]
    pub fn accept_offer(&mut self, offer_id: u32) {
        let amount = env::attached_deposit();
        require!(
            amount > 0,
            "You must attach a nonzero amount to accept an offer."
        );
        let amount: U128 = amount.into();

        let o = self.offers.remove(&offer_id).unwrap_or_else(|| {
            env::panic_str("Offer does not exist. Maybe someone already accepted it?")
        });

        require!(
            o.amount == amount,
            "You must attach exactly the same amount as the offer you are accepting."
        );
        let predecessor = env::predecessor_account_id();
        require!(
            predecessor != o.account_id,
            "You cannot accept your own offer."
        );

        let market = self
            .markets
            .get_mut(o.market_id)
            .unwrap_or_else(|| env::panic_str("Market no longer exists!"));

        ContractEvent::OfferAccepted {
            offer_id,
            market_id: o.market_id,
            account_id: predecessor.clone(),
        }
        .emit();

        let (long, short) = if o.is_long {
            (o.account_id, predecessor)
        } else {
            (predecessor, o.account_id)
        };

        market.shares.push(SharePair {
            long,
            short,
            amount: o.amount,
        });
    }

    // ------------------- View Functions ------------------- //

    pub fn get_market(&self, market_id: u32) -> Option<ViewMarket> {
        self.markets.get(market_id).map(|m| m.into())
    }

    pub fn list_markets(&self) -> Vec<ViewMarket> {
        self.markets.iter().map(|m| m.into()).collect()
    }

    pub fn get_offers(&self, market_id: u32) -> Vec<Offer> {
        self.offers
            .iter()
            .filter_map(|(_, b)| {
                if b.market_id == market_id {
                    Some(b.clone())
                } else {
                    None
                }
            })
            .collect()
    }
}
