import { doc, getDoc, updateDoc, chandriaDB } from "./sdk/chandrias-sdk.js";

// ✅ Shared Notyf Instance
const notyf = new Notyf({
    duration: 1500,
    position: { x: "center", y: "top" }
});

// ✅ Utility: Format Cart Items as HTML Table
function generateCartTable(cartItems = []) {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return `<p style="font-style: italic;">You have no items in your cart.</p>`;
    }

    return `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #FCA5A5;">
          <th style="padding: 8px; border: 1px solid #ddd;">Product</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Size</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Quantity</th>
        </tr>
      </thead>
      <tbody>
        ${cartItems
            .map(
                item => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${
                item.productName
            }</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${
                item.size || "N/A"
            }</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${
                item.quantity || 1
            }</td>
          </tr>
        `
            )
            .join("")}
      </tbody>
    </table>
  `;
}

// ✅ Utility: Send Email via Backend
function sendEmail({ to, subject, html }) {
    return $.ajax({
        url: "https://vercel-express-js-omega.vercel.app/send-email",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ email: to, subject, htmlContent: html })
    });
}

// ✅ Utility: Fetch appointment data from Firestore
async function fetchAppointmentData(appointmentId) {
    const ref = doc(chandriaDB, "appointments", appointmentId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Appointment not found.");
    return { ref, data: snap.data() };
}

// ✅ Shared footer
const footerHTML = `
  <p style="font-size: 15px; margin-top: 30px;">
    <a href="https://www.facebook.com/share/16bZ2VqVGq/">— Chandria’s La Robe</a>
  </p>
`;

// ✅ Templates
function buildConfirmationHTML(data) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px; background-color: #FEF2F2;">
      <h2 style="color: #2f855a;">🗓️ Booking Confirmed!</h2>
      <p>Hi <strong>${data.customerName}</strong>,</p>
      <p>Your appointment is <strong>confirmed</strong>:</p>
      <table style="width: 100%; margin-top: 10px; margin-bottom: 20px;">
        <tr><td style="font-weight: bold;">🗓️ Scheduled Date:</td><td>${
            data.checkoutDate
        }</td></tr>
        <tr><td style="font-weight: bold;">⏰ Scheduled Time:</td><td>${
            data.checkoutTime
        }</td></tr>
      </table>
      <h3>🛍️ Items:</h3>
      ${generateCartTable(data.cartItems)}
      <p>If you need to reschedule, contact us anytime.</p>
      ${footerHTML}
    </div>
  `;
}

function buildCancellationHTML(data) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px; background-color: #FFF1F2;">
      <h2 style="color: #dc2626;">❌ Appointment Cancelled</h2>
      <p>Hi <strong>${data.customerName}</strong>,</p>
      <p>Your appointment on <strong>${data.checkoutDate}</strong> at <strong>${
          data.checkoutTime
      }</strong> has been <strong>cancelled</strong>.</p>
      <h3>🗒️ Previous Items:</h3>
      ${generateCartTable(data.cartItems)}
      <p>If you'd like to reschedule, feel free to contact us.</p>
      ${footerHTML}
    </div>
  `;
}

function buildUndoHTML(data) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px; background-color: #FFF1F2;">
      <h2 style="color: #f59e0b;">⚠️ Confirmation Reverted</h2>
      <p>Hi <strong>${data.customerName}</strong>,</p>
      <p>Your confirmed appointment has been marked as <strong>pending</strong> again:</p>
      <table style="width: 100%; margin-top: 10px; margin-bottom: 20px;">
        <tr><td style="font-weight: bold;">🗓️ Scheduled Date:</td><td>${data.checkoutDate}</td></tr>
        <tr><td style="font-weight: bold;">⏰ Scheduled Time:</td><td>${data.checkoutTime}</td></tr>
      </table>
      <p>We'll notify you once it's confirmed again.</p>
      ${footerHTML}
    </div>
  `;
}

function buildUndoCancellationHTML(data) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px; background-color: #FEF2F2;">
      <h2 style="color: #10b981;">🔁 Cancellation Undone</h2>
      <p>Hi <strong>${data.customerName}</strong>,</p>
      <p>Your appointment originally cancelled on:</p>
      <table style="width: 100%; margin-top: 10px; margin-bottom: 20px;">
        <tr><td style="font-weight: bold;">🗓️ Scheduled Date:</td><td>${
            data.checkoutDate
        }</td></tr>
        <tr><td style="font-weight: bold;">⏰ Scheduled Time:</td><td>${
            data.checkoutTime
        }</td></tr>
      </table>
      <p>has been <strong>reconfirmed</strong>. We look forward to seeing you!</p>
      ${generateCartTable(data.cartItems)}
      ${footerHTML}
    </div>
  `;
}

// ✅ CONFIRM
$(document).on("click", ".confirm-booking-action", async () => {
    const id = $("#confirm-booking-modal").data("appointmentId");
    if (!id) return notyf.error("No appointment ID found.");

    try {
        const { data } = await fetchAppointmentData(id);
        await sendEmail({
            to: data.customerEmail,
            subject: "✅ Appointment Confirmed",
            html: buildConfirmationHTML(data)
        });
        notyf.success("Confirmation email sent!");
    } catch (err) {
        console.error("Confirm error:", err.message);
        notyf.error(err.message);
    }
});

// ❌ CANCEL
$(document).on("click", ".confirm-cancel-booking", async () => {
    const id = $("#cancel-booking-modal").data("appointmentId");
    if (!id) return notyf.error("No appointment ID found.");

    try {
        const { data } = await fetchAppointmentData(id);
        await sendEmail({
            to: data.customerEmail,
            subject: "❌ Appointment Cancelled",
            html: buildCancellationHTML(data)
        });
        notyf.success("Cancellation email sent!");
    } catch (err) {
        console.error("Cancel error:", err.message);
        notyf.error(err.message);
    }
});

// 🔁 UNDO CONFIRMATION
$(document).on("click", ".undo-confirmation", async e => {
    e.preventDefault();
    const id = $(e.currentTarget).closest(".modal").data("appointmentId");
    if (!id) return notyf.error("No appointment ID found.");

    try {
        const { ref, data } = await fetchAppointmentData(id);
        await updateDoc(ref, { checkoutStatus: "pending" });
        await sendEmail({
            to: data.customerEmail,
            subject: "⚠️ Appointment Confirmation Undone",
            html: buildUndoHTML(data)
        });
        notyf.success("Undo confirmation email sent!");
    } catch (err) {
        console.error("Undo error:", err.message);
        notyf.error(err.message);
    }
});

// 🔁 UNDO CANCELLATION
$(document).on("click", ".confirm-undo-cancellation-action", async e => {
    e.preventDefault();
    const id = $("#undo-cancellation-modal").data("appointmentId");
    if (!id) return notyf.error("No appointment ID found.");

    try {
        const { data } = await fetchAppointmentData(id);
        await sendEmail({
            to: data.customerEmail,
            subject: "🔁 Appointment Reconfirmed",
            html: buildUndoCancellationHTML(data)
        });
        notyf.success("Undo cancellation email sent!");
    } catch (err) {
        console.error("Undo cancellation error:", err.message);
        notyf.error(err.message);
    }
});
