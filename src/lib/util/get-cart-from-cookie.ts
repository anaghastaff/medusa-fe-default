'use server'
import { getCart, getCustomer } from "@lib/data";
import { getCheckoutStep } from "@lib/util/get-checkout-step";
import type { CartWithCheckoutStep } from "types/global";
import { cookies } from "next/headers";
import { enrichLineItems } from "@modules/cart/actions";
import type { LineItem } from "@medusajs/medusa";


export const fetchCart = async () => {
    const cartId = cookies().get("_medusa_cart_id")?.value;
  
    if (!cartId) {
      return null;
    }
  
    const cart = await getCart(cartId).then(
      (cart) => cart as CartWithCheckoutStep
    );
  
    if (!cart) {
      return null;
    }
    if (cart?.items.length > 0)
       {
      const enrichedItems = await enrichLineItems(cart?.items, cart?.region_id);
      cart.items = enrichedItems as LineItem[];
      
      cart.checkout_step = cart && getCheckoutStep(cart);
      return cart;
    } 
    return cart
   
  };

