
from services.base_service import BaseService
from models import Customer
from schemas import CustomerCreate

class CustomerService(BaseService[Customer, CustomerCreate, CustomerCreate]):
    def __init__(self):
        super().__init__(Customer)

customer_service = CustomerService()
