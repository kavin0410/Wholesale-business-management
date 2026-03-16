
from services.base_service import BaseService
from models import Payment
from schemas import PaymentUpdate

class PaymentService(BaseService[Payment, PaymentUpdate, PaymentUpdate]):
    def __init__(self):
        super().__init__(Payment)

payment_service = PaymentService()
