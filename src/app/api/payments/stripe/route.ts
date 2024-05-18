import {  NextRequest, NextResponse } from "next/server";
import { fetchCart } from "../../../../lib/util/get-cart-from-cookie";
import Stripe from "stripe";
import { error } from "console";

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY!, {
    apiVersion: "2024-04-10",
  });

  
const POST = async (req:NextRequest, res:NextResponse) => { 
    
    const cart = await fetchCart();
    const {session} = await req.json();
    console.log("pi in route.ts", session?.data?.id)
    
  // Create a PaymentIntent with the order amount and currency
  
    if(!cart){
        return null
    }
    if(!session.data.id){
      return NextResponse.json({error:"Payment Intent not received from payment form"})
    }
  try{
    // const customer = await stripe.customers.create({

    //     name:  cart?.billing_address?.first_name + " " + cart?.billing_address?.last_name ,  
    //     email:cart?.email,
    //     address:  {
    //         line1: cart?.billing_address?.address_1 ?? undefined  ,
    //         postal_code: cart?.billing_address?.postal_code ?? undefined,
    //         city: cart?.billing_address?.city ?? undefined,
    //         state:  cart?.billing_address?.province ?? "ABC" ,
    //         country:cart?.billing_address?.country_code ?? undefined ,       
    //     },
    // });
    // console.log('customer ID', customer?.id)

    const paymentIntent = await stripe.paymentIntents.update(
       session?.data?.id,
      {
        description: "service Transaction", 

        shipping: {
            name: cart?.shipping_address?.first_name + "" + cart?.shipping_address?.last_name ,
            address: {
              line1: cart?.shipping_address?.address_1 ?? undefined  ,
              postal_code: cart?.shipping_address?.postal_code ?? undefined,
              city: cart?.shipping_address?.city ?? undefined,
              state: cart?.shipping_address?.province ?? "ABC" ,
              country:cart?.shipping_address?.country_code ?? undefined ,
            },
          },
         
         customer: session?.data?.customer,
          amount: cart?.total ?? 0,      
          currency: cart?.region.currency_code.toLowerCase() ,
          metadata:{
            medusa_customer_id:cart?.customer_id
          },
        
      });
      console.log("paymentIntent.client_secret -",paymentIntent.client_secret)
      return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  }
  catch (error) {
    console.error(error);
    console.log(error)
    return NextResponse.json({ error: "Error creating payment intent" });
  }
};

export {POST}