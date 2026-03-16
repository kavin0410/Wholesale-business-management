
from services.base_service import BaseService
from models import Product
from schemas import ProductCreate, ProductCreate # assuming Update is same for now or use Create

class ProductService(BaseService[Product, ProductCreate, ProductCreate]):
    def __init__(self):
        super().__init__(Product)

product_service = ProductService()
