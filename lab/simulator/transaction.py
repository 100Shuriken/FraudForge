from datetime import datetime


class Transaction:

    def __init__(
        self,
        transaction_id,
        customer_id,
        merchant_id,
        amount,
        timestamp,
        device_id,
        city,
        payment_method,
        is_fraud=False,
        attack_type=None
    ):
        self.transaction_id = transaction_id
        self.customer_id = customer_id
        self.merchant_id = merchant_id
        self.amount = amount
        self.timestamp = timestamp
        self.device_id = device_id
        self.city = city
        self.payment_method = payment_method

        # Hidden ground truth
        self.is_fraud = is_fraud

        # Which Red Team attack created it?
        self.attack_type = attack_type