const CartService = require("../services/cartService");

class CartController {
    async getMyCart(req, res) {
        try {
            const cartData = await CartService.getCartWithTotals(req.user.id);
            res.json(cartData);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    async addItem(req, res) {
        try {
            console.log(" BODY QUE LLEGA AL BACKEND:", req.body);
            const updatedCart = await CartService.addItem(req.user.id, req.body);
            res.json(updatedCart);

        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async removeItem(req, res) {
        try {
            const { itemId } = req.params;
            const updatedCart = await CartService.removeItem(req.user.id, itemId);
            res.json(updatedCart);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async clearCart(req, res) {
        try {
            const cart = await CartService.clearCart(req.user.id);
            res.json({ message: "Carrito vaciado", cart });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = new CartController();