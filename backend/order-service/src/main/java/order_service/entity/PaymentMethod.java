package order_service.entity;

/** Phương thức thanh toán người mua chọn khi đặt hàng hoặc khi trả tiền. */
public enum PaymentMethod {
    COD,
    BANK_TRANSFER,
    MOMO,
    CREDIT_CARD,
    WALLET;

    /** COD thì thu tiền khi giao, các phương thức còn lại trả trước. */
    public boolean isPayOnDelivery() {
        return this == COD;
    }
}
