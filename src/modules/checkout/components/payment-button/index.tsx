"use client"

import { Cart, Order, PaymentSession, type Swap } from "@medusajs/medusa"
import { Button } from "@medusajs/ui"
import { OnApproveActions, OnApproveData } from "@paypal/paypal-js"
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { placeOrder } from "@modules/checkout/actions"
import React, { useState, useEffect } from "react"
import ErrorMessage from "../error-message"
import Spinner from "@modules/common/icons/spinner"
import Stripe from "stripe"
import type {
  StripeError,
  StripePaymentElementOptions,
} from "@stripe/stripe-js"
import { useRouter,usePathname } from "next/navigation" 



type PaymentButtonProps = {
  cart: Omit<Cart, "refundable_amount" | "refunded_total">
  "data-testid": string
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
}) => {
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    cart.shipping_methods.length < 1
      ? true
      : false

  const paymentSession = cart.payment_session as PaymentSession
        
  switch (paymentSession.provider_id) {
    case "stripe":
      return (
        <StripePaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case "manual":
      return (
        <ManualTestPaymentButton notReady={notReady} data-testid={dataTestId} />
      )
    case "paypal":
      return (
        <PayPalPaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    default:
      return <Button disabled>Select a payment method</Button>
  }
}



const StripePaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: Omit<Cart, "refundable_amount" | "refunded_total">
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState(false)
  const [cartComplete, setCartComplete] = useState<any>(null)
  
  

   const onPaymentCompleted = async () => {
    await placeOrder()
    .then((cart)=>{
      cart
      if(!cart){
        return null
      }
      setCartComplete(cart)
    })
    .catch(() => {
      setErrorMessage("An error occurred, please try again.");
      setSubmitting(false);
    });
  };

  const stripe = useStripe()
  const elements = useElements()
  const card = elements?.getElement("card")
  const pathname = usePathname();
  const router = useRouter();

  const disabled = !stripe || !elements ? true : false

   const handleError = (submitError: StripeError) => {
    setErrorMessage(submitError.message || null)
  }

  
  const session = cart?.payment_session as PaymentSession
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const pi = session?.data?.id;
    console.log("PI IN DATA ID",pi)
   
    if (!stripe || !elements || !cart) {
      setSubmitting(false)
      return
    }

    setSubmitting(true)

    // Trigger form validation and wallet collection
    const { error: submitError } = await elements.submit()
    if (submitError) {
      handleError(submitError)
      return
    }

    // Create the PaymentIntent and obtain clientSecret
    const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
    const res = await fetch(`/api/payments/stripe`, {
      credentials:'include',
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-cache",
      body: JSON.stringify({session})
    })

    // const { client_secret: clientSecret } = await res.json()
    const {clientSecret} = await res.json();
    console.log("clientsecret", clientSecret)
    // Use the clientSecret and Elements instance to confirm the setup
    
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: "",
      },
      // Uncomment below if you only want redirect for redirect-based payments
      redirect: "if_required",
    })
    
    

    if (error) {
      const pi = error.payment_intent
      console.log("error log", pi)
      if (
        (pi && pi.status === "requires_capture") ||
        (pi && pi.status === "succeeded")
      ) {
        await onPaymentCompleted()
       
       
      }

      setErrorMessage(error.message || null)
      return
    }

    if (
      (paymentIntent && paymentIntent.status === "requires_capture") ||
      paymentIntent.status === "succeeded"
    ) {
     await onPaymentCompleted()       
    }

   
    if (error) {
      handleError(error)
    }
  }

  

  const options = {
    layout: "tabs" as "tabs"
  }

  return (
    <>
     
        <div className="flex flex-col gap-x-1 gap-y-4 max-w-md bg-blue-300 p-4" >
          <form id="payment-form" onSubmit={handleSubmit} className="flex flex-col gap-y-4">
          <PaymentElement
            options={options}
            onChange={(e) => setCardComplete(e.complete)}
          />

          <Button
            disabled={disabled || notReady || !cardComplete}
            type="submit"
            size="large"
            isLoading={submitting}
            data-testid={dataTestId}
            className="gap-y-4"
          >
            Place order
          </Button>
          </form>
        </div>
      
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-payment-error-message"
      />
    </>
  )
}

const PayPalPaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: Omit<Cart, "refundable_amount" | "refunded_total">
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onPaymentCompleted = async () => {
    await placeOrder().catch(() => {
      setErrorMessage("An error occurred, please try again.")
      setSubmitting(false)
    })
  }

  const session = cart.payment_session as PaymentSession

  const handlePayment = async (
    _data: OnApproveData,
    actions: OnApproveActions
  ) => {
    actions?.order
      ?.authorize()
      .then((authorization) => {
        if (authorization.status !== "COMPLETED") {
          setErrorMessage(`An error occurred, status: ${authorization.status}`)
          return
        }
        onPaymentCompleted()
      })
      .catch(() => {
        setErrorMessage(`An unknown error occurred, please try again.`)
        setSubmitting(false)
      })
  }

  const [{ isPending, isResolved }] = usePayPalScriptReducer()

  if (isPending) {
    return <Spinner />
  }

  if (isResolved) {
    return (
      <>
        <PayPalButtons
          style={{ layout: "horizontal" }}
          createOrder={async () => session.data.id as string}
          onApprove={handlePayment}
          disabled={notReady || submitting || isPending}
          data-testid={dataTestId}
        />
        <ErrorMessage
          error={errorMessage}
          data-testid="paypal-payment-error-message"
        />
      </>
    )
  }
}

const ManualTestPaymentButton = ({ notReady }: { notReady: boolean }) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cartComplete, setCartComplete] = useState<any>(null)
  const router = useRouter();
  const onPaymentCompleted = async () => {
    await placeOrder()
    .then((cart)=> {
      cart
      if(!cart){
        return null
      }
      setCartComplete(cart)
    })
    .catch((err) => {
      setErrorMessage(err.toString())
      setSubmitting(false)
    })
  }

  const handlePayment = () => {
    setSubmitting(true)

    onPaymentCompleted()
  }

  if(!cartComplete){
    return null
  }
  if(cartComplete.type === "order")
    {
      const countryCode = cartComplete?.data.shipping_address.country_code;
      router.push(`/${countryCode}/order/confirmed/${cartComplete?.data.id}`)
    }

  return (
    <>
      <Button
        disabled={notReady}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        data-testid="submit-order-button"
      >
        Place order
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="manual-payment-error-message"
      />
    </>
  )
}

export default PaymentButton
