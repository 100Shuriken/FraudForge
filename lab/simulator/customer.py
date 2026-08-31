class Customer:

    def __init__(
        self,
        customer_id,
        age,
        city,
        income,
        usual_device,
        usual_payment_method,
        average_transaction_amount,
        daily_transaction_count,
        favourite_categories,
        usual_start_hour,
        usual_end_hour
    ):
        self.customer_id = customer_id
        self.age = age
        self.city = city
        self.income = income

        # Normal payment behaviour
        self.usual_device = usual_device
        self.usual_payment_method = usual_payment_method

        # Spending behaviour
        self.average_transaction_amount = average_transaction_amount
        self.daily_transaction_count = daily_transaction_count

        # Merchant preferences
        self.favourite_categories = favourite_categories

        # Normal transaction time
        self.usual_start_hour = usual_start_hour
        self.usual_end_hour = usual_end_hour