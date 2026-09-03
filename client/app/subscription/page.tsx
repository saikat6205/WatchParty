"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

interface User {
  _id: string;
  name: string;
  email: string;
  plan: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  downloads: string;
  watchTime: string;
  ads: string;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    downloads: "1 download/day",
    watchTime: "Limited watch time",
    ads: "Ads included",
  },
  {
    id: "bronze",
    name: "Bronze",
    price: 99,
    downloads: "5 downloads/day",
    watchTime: "Longer watch time",
    ads: "Fewer ads",
  },
  {
    id: "silver",
    name: "Silver",
    price: 199,
    downloads: "10 downloads/day",
    watchTime: "Extended watch time",
    ads: "Ad-free viewing",
  },
  {
    id: "gold",
    name: "Gold",
    price: 299,
    downloads: "Unlimited downloads",
    watchTime: "Maximum watch time",
    ads: "Ad-free viewing",
  },
];

/*
 * Read userId from localStorage safely.
 *
 * We use useSyncExternalStore instead of:
 *
 * useEffect(() => {
 *   setUserId(...)
 * }, [])
 *
 * This prevents the React set-state-in-effect error.
 */

const subscribeToUserId = (callback: () => void) => {
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener("storage", callback);
  };
};

const getUserIdSnapshot = () => {
  return window.localStorage.getItem("userId") || "";
};

const getUserIdServerSnapshot = () => {
  return "";
};

export default function SubscriptionPage() {
  const userId = useSyncExternalStore(
    subscribeToUserId,
    getUserIdSnapshot,
    getUserIdServerSnapshot
  );

  const [currentPlan, setCurrentPlan] =
    useState<string>("free");

  const [user, setUser] =
    useState<User | null>(null);

  const [processingPlan, setProcessingPlan] =
    useState<string>("");

  const [errorMessage, setErrorMessage] =
    useState<string>("");

  const [successMessage, setSuccessMessage] =
    useState<string>("");

  /*
   * Load user information.
   *
   * IMPORTANT:
   * There is NO synchronous setState directly
   * inside the effect.
   */
  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;

    const loadUserData = async () => {
      try {
        /*
         * Get today's plan information.
         */
        const planResponse = await fetch(
          `http://localhost:5000/api/downloads/user/${userId}/today`
        );

        if (planResponse.ok) {
          const planData =
            await planResponse.json();

          if (
            !cancelled &&
            planData.success &&
            planData.plan
          ) {
            setCurrentPlan(planData.plan);
          }
        }

        /*
         * Get complete user information.
         */
        const userResponse = await fetch(
          `http://localhost:5000/api/subscription/user/${userId}`
        );

        if (!userResponse.ok) {
          throw new Error(
            `User API returned ${userResponse.status}`
          );
        }

        const userData =
          await userResponse.json();

        if (
          !cancelled &&
          userData.success &&
          userData.user
        ) {
          setUser(userData.user);

          if (userData.user.plan) {
            setCurrentPlan(
              userData.user.plan
            );
          }
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Could not load user data:",
          error
        );

        setErrorMessage(
          "Could not connect to the backend server."
        );
      }
    };

    loadUserData();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /*
   * Load Razorpay Checkout script.
   */
  const loadRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      /*
       * Already loaded.
       */
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      /*
       * Check whether script already exists.
       */
      const existingScript =
        document.querySelector(
          'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
        );

      if (existingScript) {
        const handleLoad = () => {
          resolve(true);
        };

        const handleError = () => {
          resolve(false);
        };

        existingScript.addEventListener(
          "load",
          handleLoad
        );

        existingScript.addEventListener(
          "error",
          handleError
        );

        return;
      }

      /*
       * Create Razorpay script.
       */
      const script =
        document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.async = true;

      script.onload = () => {
        resolve(true);
      };

      script.onerror = () => {
        resolve(false);
      };

      document.body.appendChild(script);
    });
  };

  /*
   * Upgrade subscription plan.
   */
  const handleUpgrade = async (
    plan: Plan
  ) => {
    /*
     * Get current userId.
     */
    const currentUserId =
      userId ||
      window.localStorage.getItem("userId") ||
      "";

    if (!currentUserId) {
      setErrorMessage(
        "User ID not found. Please login again."
      );
      return;
    }

    /*
     * Free plan does not need payment.
     */
    if (plan.id === "free") {
      return;
    }

    /*
     * Already selected/current plan.
     */
    if (plan.id === currentPlan) {
      return;
    }

    try {
      setProcessingPlan(plan.id);
      setErrorMessage("");
      setSuccessMessage("");

      /*
       * Load Razorpay.
       */
      const razorpayLoaded =
        await loadRazorpay();

      if (
        !razorpayLoaded ||
        !window.Razorpay
      ) {
        setErrorMessage(
          "Razorpay Checkout could not be loaded. Please check your internet connection."
        );

        setProcessingPlan("");
        return;
      }

      /*
       * Create Razorpay order.
       */
      const orderResponse =
        await fetch(
          "http://localhost:5000/api/subscription/create-order",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              userId: currentUserId,
              plan: plan.id,
            }),
          }
        );

      const orderData =
        await orderResponse.json();

      if (
        !orderResponse.ok ||
        !orderData.success
      ) {
        setErrorMessage(
          orderData.message ||
            "Could not create Razorpay order."
        );

        setProcessingPlan("");
        return;
      }

      /*
       * Razorpay options.
       */
      const options: RazorpayOptions = {
        key: orderData.keyId,

        amount: orderData.amount,

        currency:
          orderData.currency || "INR",

        name: "WatchParty",

        description:
          `${plan.name} Subscription`,

        order_id: orderData.orderId,

        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },

        theme: {
          color: "#2563eb",
        },

        /*
         * Payment successful.
         */
        handler: async (
          response: RazorpayResponse
        ) => {
          try {
            setProcessingPlan(plan.id);
            setErrorMessage("");
            setSuccessMessage("");

            /*
             * Verify payment on backend.
             */
            const verifyResponse =
              await fetch(
                "http://localhost:5000/api/subscription/verify-payment",
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body: JSON.stringify({
                    userId: currentUserId,

                    plan: plan.id,

                    razorpay_order_id:
                      response.razorpay_order_id,

                    razorpay_payment_id:
                      response.razorpay_payment_id,

                    razorpay_signature:
                      response.razorpay_signature,
                  }),
                }
              );

            const verifyData =
              await verifyResponse.json();

            if (
              !verifyResponse.ok ||
              !verifyData.success
            ) {
              setErrorMessage(
                verifyData.message ||
                  "Payment verification failed."
              );

              return;
            }

            /*
             * Payment verified.
             */
            setCurrentPlan(plan.id);

            if (verifyData.user) {
              setUser(verifyData.user);
            }

            setSuccessMessage(
              `${plan.name} plan activated successfully! Payment ID: ${response.razorpay_payment_id}`
            );
          } catch (error) {
            console.error(
              "Payment verification error:",
              error
            );

            setErrorMessage(
              "Payment was completed, but verification failed. Please check the server."
            );
          } finally {
            setProcessingPlan("");
          }
        },

        /*
         * Razorpay closed.
         */
        modal: {
          ondismiss: () => {
            setProcessingPlan("");
          },
        },
      };

      const razorpay =
        new window.Razorpay(options);

      razorpay.open();

      /*
       * Razorpay has now taken over.
       * Do not clear processing state here because
       * the payment handler / dismiss callback manages it.
       */
    } catch (error) {
      console.error(
        "Upgrade error:",
        error
      );

      setErrorMessage(
        "Something went wrong while starting the payment."
      );

      setProcessingPlan("");
    }
  };

  /*
   * User ID is genuinely missing.
   */
  if (!userId) {
    return (
      <main style={styles.page}>
        <div style={styles.errorBox}>
          <h2>User ID not found</h2>

          <p>
            Please login again and open the
            subscription page.
          </p>

          <p>
            If you are testing manually, open
            the browser console and check:
          </p>

          <code style={styles.code}>
  {'localStorage.getItem("userId")'}
</code>
        </div>
      </main>
    );
  }

  /*
   * Main subscription page.
   */
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>
          WatchParty Subscription
        </h1>

        <p style={styles.subtitle}>
          Upgrade your plan and unlock more
          WatchParty features
        </p>

        {user && (
          <p style={styles.userInfo}>
            Welcome, {user.name}
          </p>
        )}

        {errorMessage && (
          <div style={styles.errorMessage}>
            ❌ {errorMessage}
          </div>
        )}

        {successMessage && (
          <div style={styles.successMessage}>
            ✅ {successMessage}
          </div>
        )}

        <div style={styles.plansContainer}>
          {plans.map((plan) => {
            const isCurrent =
              plan.id === currentPlan;

            const isProcessing =
              processingPlan === plan.id;

            return (
              <div
                key={plan.id}
                style={{
                  ...styles.card,
                  ...(isCurrent
                    ? styles.currentCard
                    : {}),
                }}
              >
                {isCurrent && (
                  <div
                    style={
                      styles.currentBadge
                    }
                  >
                    CURRENT PLAN
                  </div>
                )}

                <h2
                  style={styles.planName}
                >
                  {plan.name}
                </h2>

                <div
                  style={styles.price}
                >
                  ₹{plan.price}

                  {plan.price > 0 && (
                    <span
                      style={styles.month}
                    >
                      /month
                    </span>
                  )}
                </div>

                <div
                  style={styles.features}
                >
                  <p>
                    ✓ {plan.downloads}
                  </p>

                  <p>
                    ✓ {plan.watchTime}
                  </p>

                  <p>
                    ✓ {plan.ads}
                  </p>
                </div>

                {isCurrent ? (
                  <button
                    style={
                      styles.currentButton
                    }
                    disabled
                  >
                    Current Plan
                  </button>
                ) : plan.id === "free" ? (
                  <button
                    style={
                      styles.currentButton
                    }
                    disabled
                  >
                    Free Plan
                  </button>
                ) : (
                  <button
                    style={
                      styles.upgradeButton
                    }
                    onClick={() =>
                      handleUpgrade(plan)
                    }
                    disabled={
                      processingPlan !== ""
                    }
                  >
                    {isProcessing
                      ? "Processing..."
                      : "Upgrade Now"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

/*
 * Styles
 */
const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",

    background:
      "linear-gradient(135deg, #0f172a, #172554, #3b0764)",

    padding: "60px 20px",

    color: "#ffffff",
  },

  container: {
    maxWidth: "1350px",

    margin: "0 auto",
  },

  title: {
    textAlign: "center",

    fontSize: "48px",

    fontWeight: "500",

    marginBottom: "20px",
  },

  subtitle: {
    textAlign: "center",

    fontSize: "18px",

    color: "#dbeafe",

    marginBottom: "20px",
  },

  userInfo: {
    textAlign: "center",

    fontSize: "17px",

    color: "#bfdbfe",

    marginBottom: "25px",
  },

  errorBox: {
    maxWidth: "600px",

    margin: "100px auto",

    background: "#ffffff",

    color: "#111827",

    padding: "40px",

    borderRadius: "20px",

    textAlign: "center",
  },

  code: {
    display: "block",

    background: "#f1f5f9",

    padding: "12px",

    borderRadius: "8px",

    marginTop: "15px",

    wordBreak: "break-all",
  },

  errorMessage: {
    maxWidth: "800px",

    margin: "0 auto 25px",

    padding: "15px",

    borderRadius: "10px",

    background: "#7f1d1d",

    color: "#fecaca",

    textAlign: "center",
  },

  successMessage: {
    maxWidth: "900px",

    margin: "0 auto 25px",

    padding: "15px",

    borderRadius: "10px",

    background: "#14532d",

    color: "#bbf7d0",

    textAlign: "center",
  },

  plansContainer: {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",

    gap: "28px",

    alignItems: "stretch",
  },

  card: {
    background: "#ffffff",

    color: "#0f172a",

    borderRadius: "20px",

    padding: "38px",

    minHeight: "430px",

    display: "flex",

    flexDirection: "column",

    boxSizing: "border-box",
  },

  currentCard: {
    border: "3px solid #22c55e",
  },

  currentBadge: {
    display: "inline-block",

    alignSelf: "flex-start",

    background: "#22c55e",

    color: "#ffffff",

    padding: "8px 15px",

    borderRadius: "20px",

    fontSize: "14px",

    marginBottom: "25px",
  },

  planName: {
    fontSize: "32px",

    fontWeight: "500",

    marginBottom: "25px",
  },

  price: {
    fontSize: "38px",

    fontWeight: "700",

    marginBottom: "30px",
  },

  month: {
    fontSize: "16px",

    fontWeight: "400",
  },

  features: {
    fontSize: "18px",

    color: "#334155",

    lineHeight: "1.7",

    flex: 1,
  },

  upgradeButton: {
    width: "100%",

    border: "none",

    borderRadius: "10px",

    padding: "16px",

    background: "#2563eb",

    color: "#ffffff",

    fontSize: "18px",

    fontWeight: "600",

    cursor: "pointer",
  },

  currentButton: {
    width: "100%",

    border: "none",

    borderRadius: "10px",

    padding: "16px",

    background: "#94a3b8",

    color: "#ffffff",

    fontSize: "18px",

    fontWeight: "600",

    cursor: "not-allowed",
  },
};