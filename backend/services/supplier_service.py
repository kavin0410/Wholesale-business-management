
from services.base_service import BaseService
from models import Supplier
from schemas import SupplierCreate # assuming same update schema

class SupplierService(BaseService[Supplier, SupplierCreate, SupplierCreate]):
    def __init__(self):
        super().__init__(Supplier)

supplier_service = SupplierService()
