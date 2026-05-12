(function () {
  if (window.Durapayment) return;

  let modalContainer = null;
  let iframe = null;
  let loader = null;
  // const baseUrlApi = "http://localhost:8001";
  // const baseUrlApp = "http://localhost:3001";
  const baseUrlApi = "https://checkoutapi.durapayment.com";
  const baseUrlApp = "https://checkout.durapayment.com";

  function createModal() {
    if (modalContainer) return;

    modalContainer = document.createElement("div");
    modalContainer.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.52);
      z-index: 999999;
      display: flex;
      justify-content: center;
      align-items: center;
    `;

    // Add a progress loader at the center
    loader = document.createElement("div");
    loader.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #14644c;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `;

    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
      0% { transform: translate(-50%, -50%) rotate(0deg); }
      100% { transform: translate(-50%, -50%) rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    modalContainer.appendChild(loader);

    iframe = document.createElement("iframe");
    iframe.style.cssText = `
      width: 100%;
      max-width: 450px;
      margin: 0 10px;
      height: 600px;
      border: none;
      border-radius: 12px;
    `;

    iframe.setAttribute("allow", "clipboard-write");

    modalContainer.appendChild(iframe);
    document.body.appendChild(modalContainer);

    // Close modal when clicking outside
    modalContainer.addEventListener("click", (e) => {
      if (e.target === modalContainer) {
        closeModal();
      }
    });
  }

  function openCheckout(config) {
    createModal();

    // Build URL with config as query params
    const params = new URLSearchParams({
      public_key: config.public_key || "",
      amount: config.amount || 0,
      customer_email: config.customer_email || "",
      currency: config.currency || "NGN",
      redirect_url: config.redirect_url || "",
      customer_firstname: config.customer_firstname || "",
      customer_lastname: config.customer_lastname || "",
      customer_phone: config.customer_phone || "",
    });

    // Initiate payment session here if needed (e.g., fetch a session ID)
    fetch(`${baseUrlApi}/api/v1/checkout/init`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.public_key || ""}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(config),
    })
      .then((r) => r.json())
      .then((data) => {
        const checkoutUrl = `${baseUrlApp}?ref=${data.data.ref}`;
        if (data.data.ref) {
          loader.style.display = "none";
          window.location.href = checkoutUrl;
        }
      })
      .catch((error) => {
        console.error("Durapayment: Error initiating checkout");
        loader.style.display = "none";
        // Open a sheet modal with error message and a button to close
        const errorModal = document.createElement("div");
        errorModal.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          width: 70%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        `;

        const errorMessage = document.createElement("p");
        errorMessage.textContent =
          "An error occurred while initiating the checkout. Please try again.";
        errorModal.appendChild(errorMessage);

        const closeButton = document.createElement("button");
        closeButton.textContent = "Close";
        closeButton.style.cssText = `
          margin-top: 15px;
          padding: 10px 20px;
          background: #14644c;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        `;
        closeButton.addEventListener("click", () => {
          closeModal();
        });
        errorModal.appendChild(closeButton);

        modalContainer.appendChild(errorModal);
      });

    // iframe.src = checkoutUrl;
  }

  function closeModal() {
    if (modalContainer) {
      modalContainer.remove();
      modalContainer = null;
      iframe = null;
    }
  }

  // Listen for messages from the iframe (success, close, etc.)
  window.addEventListener("message", (event) => {
    // Important: check origin in production
    // if (event.origin !== "http://localhost:3000") return;
    const data = event.data;
    if (data?.type === "durapayment-close") {
      closeModal();
    }

    if (data?.type === "durapayment-success") {
      // console.log("Payment successful!", data);
      if (typeof config?.onSuccess === "function") {
        config.onSuccess(data);
      }
      closeModal();
    }

    if (data?.type === "durapayment-redirect") {
      // Most reliable ways (try in this order):
      window.location.href = data.url; // usually works
      closeModal();
    }
  });

  // Public API
  window.Durapayment = {
    checkout: function (config = {}) {
      if (!config.amount || config.amount <= 0) {
        // console.error("Durapayment: amount is required and must be greater than 0");
        return;
      }
      openCheckout(config);
    },
    // Optional: allow closing programmatically
    close: closeModal,
  };

  //   console.log("Durapayment SDK loaded (development mode)");
})();
