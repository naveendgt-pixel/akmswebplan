"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import SectionCard from "@/components/SectionCard";
import StatCard from "@/components/StatCard";
import { supabase } from "@/lib/supabaseClient";
import { paymentMethods, paymentTypes, workflowStages, formatDate } from "@/lib/constants";

interface OrderData {
  id: string;
  order_number: string;
  quotation_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  event_type: string;
  event_date: string;
  event_end_date: string;
  event_venue: string;
  event_city: string;
  package_type: string;
  photo_type: string;
  photo_area: string;
  photo_cameras: number;
  photo_rate: number;
  photo_session: string;
  video_type: string;
  video_area: string;
  video_cameras: number;
  video_rate: number;
  video_session: string;
  num_albums: number;
  sheets_per_album: number;
  total_photos: number;
  album_size: string;
  mini_books: number;
  calendars: number;
  frames: number;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  payment_status: string;
  delivery_status: string;
  order_completed: string;
  workflow_status: string;
  final_budget: number;
  notes: string;
  created_at: string;
}

interface OrderItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
}

interface Expense {
  id: string;
  order_id: string;
  order_item_id: string | null;
  description: string;
  amount: number;
  category: string;
  vendor_name: string;
  expense_date: string;
}

interface Payment {
  id: string;
  payment_number: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes: string;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "payments">("overview");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPostProdExpenseModal, setShowPostProdExpenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>("");
  const [editingFinalBudget, setEditingFinalBudget] = useState(false);
  const [finalBudgetInput, setFinalBudgetInput] = useState<number>(0);
  const [editingCreatedDate, setEditingCreatedDate] = useState(false);
  const [createdDateInput, setCreatedDateInput] = useState<string>("");

  // Post Production Expense Categories (fixed for all orders)
  const postProdCategories = [
    "Album Designing",
    "Album Printing",
    "Traditional Video Editing",
    "Candid Video Editing",
    "Photo Retouching",
    "Invitation Video",
    "Advertisement Video",
    "Miscellaneous"
  ];

  const [expenseForm, setExpenseForm] = useState({
    category: "",
    vendor_name: "",
    amount: 0,
    expense_date: new Date().toISOString().split("T")[0],
    description: "",
    order_item_id: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    payment_type: "",
    payment_method: "",
    amount: 0,
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    const fetchOrderData = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", resolvedParams.id)
          .single();

        if (orderError) throw orderError;
        setOrder(orderData);

        if (orderData.customer_id) {
          const { data: customerData } = await supabase
            .from("customers")
            .select("*")
            .eq("id", orderData.customer_id)
            .single();
          setCustomer(customerData);
        }

        const { data: itemsData } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", resolvedParams.id);
        setItems(itemsData || []);

        const { data: expensesData } = await supabase
          .from("expenses")
          .select("*")
          .eq("order_id", resolvedParams.id)
          .order("expense_date", { ascending: false });
        setExpenses(expensesData || []);

        const { data: paymentsData } = await supabase
          .from("payments")
          .select("*")
          .eq("order_id", resolvedParams.id)
          .order("payment_date", { ascending: false });
        setPayments(paymentsData || []);
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [resolvedParams.id]);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  // Use final_budget if set, otherwise fall back to total_amount (estimated budget)
  const effectiveBudget = order?.final_budget || order?.total_amount || 0;
  const profit = effectiveBudget - totalExpenses;
  const balanceDue = effectiveBudget - totalPayments;

  const photographyItems = items.filter((i) => i.category?.toLowerCase() === "photography" || i.description.toLowerCase().includes("photography"));
  const videographyItems = items.filter((i) => i.category?.toLowerCase() === "videography" || i.description.toLowerCase().includes("videography"));
  const additionalItems = items.filter(
    (i) =>
      i.category?.toLowerCase() !== "photography" &&
      i.category?.toLowerCase() !== "videography" &&
      !i.description.toLowerCase().includes("photography") &&
      !i.description.toLowerCase().includes("videography")
  );

  // Get expenses for a specific service (matches by description/category)
  const getExpensesForService = (serviceDescription: string) => {
    return expenses.filter((e) => e.category === serviceDescription);
  };

  const getServiceExpenseTotal = (serviceDescription: string) => {
    return getExpensesForService(serviceDescription).reduce((sum, e) => sum + e.amount, 0);
  };

  const getServiceCategoryTotal = (categoryItems: OrderItem[]) => {
    return categoryItems.reduce((sum, i) => sum + i.total_price, 0);
  };

  // Get all unique service descriptions for the expense dropdown
  const getServiceCategories = () => {
    const categories: string[] = [];
    items.forEach((item) => {
      if (!categories.includes(item.description)) {
        categories.push(item.description);
      }
    });
    return categories;
  };

  const handleOpenExpenseModal = (serviceDescription: string) => {
    setSelectedServiceCategory(serviceDescription);
    setExpenseForm({ ...expenseForm, category: serviceDescription });
    setShowExpenseModal(true);
  };

  // Check if expense is a post production expense
  const isPostProdExpense = (category: string) => postProdCategories.includes(category);

  // Get post production expenses
  const getPostProdExpenses = () => expenses.filter((e) => isPostProdExpense(e.category));
  const postProdExpenseTotal = getPostProdExpenses().reduce((sum, e) => sum + e.amount, 0);

  // Get service-only expenses (exclude post production)
  const serviceExpensesTotal = expenses.filter((e) => !isPostProdExpense(e.category)).reduce((sum, e) => sum + e.amount, 0);

  const handleOpenPostProdModal = (category?: string) => {
    setExpenseForm({ ...expenseForm, category: category || "" });
    setShowPostProdExpenseModal(true);
  };

  const handleSavePostProdExpense = async () => {
    if (!supabase || !order) return;
    try {
      if (editingExpense) {
        await supabase.from("expenses").update({
          category: expenseForm.category,
          vendor_name: expenseForm.vendor_name,
          amount: expenseForm.amount,
          expense_date: expenseForm.expense_date,
          description: expenseForm.description,
        }).eq("id", editingExpense.id);
      } else {
        await supabase.from("expenses").insert({
          order_id: order.id,
          category: expenseForm.category,
          vendor_name: expenseForm.vendor_name,
          amount: expenseForm.amount,
          expense_date: expenseForm.expense_date,
          description: expenseForm.description,
        });
      }
      const { data } = await supabase.from("expenses").select("*").eq("order_id", order.id).order("expense_date", { ascending: false });
      setExpenses(data || []);
      setShowPostProdExpenseModal(false);
      setEditingExpense(null);
      setExpenseForm({ category: "", vendor_name: "", amount: 0, expense_date: new Date().toISOString().split("T")[0], description: "", order_item_id: "" });
    } catch (error) {
      console.error("Error saving post production expense:", error);
    }
  };

  const handleEditPostProdExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      category: expense.category,
      vendor_name: expense.vendor_name || "",
      amount: expense.amount,
      expense_date: expense.expense_date,
      description: expense.description || "",
      order_item_id: "",
    });
    setShowPostProdExpenseModal(true);
  };

  const handleSaveExpense = async () => {
    if (!supabase || !order) return;
    try {
      if (editingExpense) {
        await supabase.from("expenses").update({
          category: expenseForm.category,
          vendor_name: expenseForm.vendor_name,
          amount: expenseForm.amount,
          expense_date: expenseForm.expense_date,
          description: expenseForm.description,
          order_item_id: expenseForm.order_item_id || null,
        }).eq("id", editingExpense.id);
      } else {
        await supabase.from("expenses").insert({
          order_id: order.id,
          category: expenseForm.category,
          vendor_name: expenseForm.vendor_name,
          amount: expenseForm.amount,
          expense_date: expenseForm.expense_date,
          description: expenseForm.description,
          order_item_id: expenseForm.order_item_id || null,
        });
      }
      const { data } = await supabase.from("expenses").select("*").eq("order_id", order.id).order("expense_date", { ascending: false });
      setExpenses(data || []);
      setShowExpenseModal(false);
      setEditingExpense(null);
      setSelectedServiceCategory("");
      setExpenseForm({ category: "", vendor_name: "", amount: 0, expense_date: new Date().toISOString().split("T")[0], description: "", order_item_id: "" });
    } catch (error) {
      console.error("Error saving expense:", error);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!supabase || !order || !confirm("Delete this expense?")) return;
    try {
      await supabase.from("expenses").delete().eq("id", expenseId);
      setExpenses(expenses.filter((e) => e.id !== expenseId));
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      category: expense.category,
      vendor_name: expense.vendor_name || "",
      amount: expense.amount,
      expense_date: expense.expense_date,
      description: expense.description,
      order_item_id: expense.order_item_id || "",
    });
    setShowExpenseModal(true);
  };

  const generatePaymentNumber = async () => {
    if (!supabase) {
      const year = new Date().getFullYear().toString().slice(-2);
      return `PAY_AKP_${year}_0001`;
    }
    const { data } = await supabase.from("payments").select("payment_number").order("created_at", { ascending: false }).limit(1);
    const year = new Date().getFullYear().toString().slice(-2);
    if (!data || data.length === 0) return `PAY_AKP_${year}_0001`;
    const lastNumber = data[0].payment_number;
    const match = lastNumber.match(/_(\d{4})$/);
    const nextNum = match ? parseInt(match[1]) + 1 : 1;
    return `PAY_AKP_${year}_${nextNum.toString().padStart(4, "0")}`;
  };

  // WhatsApp notification helper
  const sendWhatsAppNotification = (phone: string, message: string) => {
    if (!phone) return;
    // Normalize phone: keep digits, strip leading zeros, ensure country code
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.replace(/^0+/, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
    if (cleanPhone.length < 10) return; // invalid
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  // Generate payment notification message
  const generatePaymentMessage = (
    customerName: string,
    eventType: string,
    eventDate: string | null,
    amountPaid: number,
    totalAmount: number,
    balanceRemaining: number,
    paymentType: string
  ) => {
    const formattedEventDate = eventDate ? formatDate(eventDate) : 'N/A';
    const formattedPaid = formatCurrency(amountPaid);
    const formattedTotal = formatCurrency(totalAmount);
    const formattedBalance = formatCurrency(balanceRemaining);
    
    if (balanceRemaining <= 0) {
      return `🎉 *Payment Received - Aura Knot Photography*

Dear ${customerName},

Thank you! We have received your ${paymentType} payment.

📝 *Event Details:*
• Event: ${eventType}
• Date: ${formattedEventDate}

💰 *Payment Details:*
• Amount Received: ${formattedPaid}
• Total Amount: ${formattedTotal}
• Balance: ₹0 (FULLY PAID ✅)

Thank you for choosing Aura Knot Photography! 📸

For any queries, contact us at +91 8610 100 885`;
    } else {
      return `✅ *Payment Received - Aura Knot Photography*

Dear ${customerName},

Thank you! We have received your ${paymentType} payment.

📝 *Event Details:*
• Event: ${eventType}
• Date: ${formattedEventDate}

💰 *Payment Details:*
• Amount Received: ${formattedPaid}
• Total Amount: ${formattedTotal}
• Remaining Balance: ${formattedBalance}

Please clear the remaining balance as per the agreed schedule.

For any queries, contact us at +91 8610 100 885

Thank you for choosing Aura Knot Photography! 📸`;
    }
  };

  // Generate workflow status notification message
  const generateWorkflowMessage = (
    customerName: string,
    orderNumber: string,
    workflowStage: string,
    eventType: string
  ) => {
    // Try to get custom message from localStorage
    const whatsappMessages = (() => {
      try {
        return JSON.parse(localStorage.getItem("whatsapp_messages") || "{}");
      } catch {
        return {};
      }
    })();

    const defaultWorkflowMessages: Record<string, string> = {
      "Photo Selection": `Hi {customerName},\n\n✓ Photo Selection Complete\n\nWe've completed the photo selection process for your {eventType}. Your album is ready for the next stage!\n\nOrder: {orderNumber}\n\nThank you for choosing Aura Knot Photography! 📸`,
      "Album Design": `Hi {customerName},\n\n✓ Album Design Complete\n\nYour album design is finalized and ready for printing. We'll keep you updated on the next stages!\n\nOrder: {orderNumber}\n\nThank you for choosing Aura Knot Photography! 📸`,
      "Album Printing": `Hi {customerName},\n\n✓ Album Printing In Progress\n\nYour album is currently being printed with premium quality. We'll notify you as soon as it's ready!\n\nOrder: {orderNumber}\n\nThank you for choosing Aura Knot Photography! 📸`,
      "Video Editing": `Hi {customerName},\n\n✓ Video Editing Complete\n\nYour highlight video is ready! We've crafted beautiful memories from your {eventType}.\n\nOrder: {orderNumber}\n\nThank you for choosing Aura Knot Photography! 📸`,
      "Outdoor Shoot": `Hi {customerName},\n\n✓ Outdoor Shoot Scheduled\n\nWe're excited to capture your outdoor moments! Details will be shared soon.\n\nOrder: {orderNumber}\n\nThank you for choosing Aura Knot Photography! 📸`,
      "Album Delivery": `Hi {customerName},\n\n✓ Album Delivered\n\nYour beautiful album and all deliverables are ready! Thank you for trusting Aura Knot Photography.\n\nOrder: {orderNumber}\n\nThank you for choosing Aura Knot Photography! 📸`,
    };

    const template = whatsappMessages[workflowStage] || defaultWorkflowMessages[workflowStage] || `Workflow stage "${workflowStage}" is now complete for your order ${orderNumber}`;
    
    return template
      .replace(/{customerName}/g, customerName)
      .replace(/{orderNumber}/g, orderNumber)
      .replace(/{workflowStage}/g, workflowStage)
      .replace(/{eventType}/g, eventType);
  };

  // Generate order completion notification message
  const generateOrderCompletionMessage = (
    customerName: string,
    orderNumber: string,
    eventType: string
  ) => {
    // Try to get custom message from localStorage
    const whatsappMessages = (() => {
      try {
        return JSON.parse(localStorage.getItem("whatsapp_messages") || "{}");
      } catch {
        return {};
      }
    })();

    const defaultMessage = `Hi {customerName},\n\n🎉 Your Order is Complete!\n\nThank you for trusting Aura Knot Photography for your {eventType}. All deliverables are ready for pickup/delivery.\n\nOrder #{orderNumber}\n\nWe'd love to hear from you! Please share your feedback.\n\n- Aura Knot`;
    const template = whatsappMessages["Order Completed"] || defaultMessage;
    
    return template
      .replace(/{customerName}/g, customerName)
      .replace(/{orderNumber}/g, orderNumber)
      .replace(/{eventType}/g, eventType);
  };

  const handleSavePayment = async () => {
    if (!supabase || !order) return;
    if (!paymentForm.payment_type || !paymentForm.payment_method || !paymentForm.amount) {
      alert("Please fill in Payment Type, Payment Method, and Amount");
      return;
    }
    try {
      // Use resolvedParams.id to ensure we use the exact ID from URL that matched the order
      const orderId = resolvedParams.id;
      
      // Debug: Verify order exists in database before inserting payment
      const { data: verifyOrder, error: verifyError } = await supabase
        .from("orders")
        .select("id")
        .eq("id", orderId)
        .single();
      
      if (verifyError || !verifyOrder) {
        console.error("Order verification failed:", verifyError);
        alert("Error: Order not found in database. The order may not have been saved properly.");
        return;
      }
      
      const paymentNumber = await generatePaymentNumber();
      const { error: insertError } = await supabase.from("payments").insert({
        payment_number: paymentNumber,
        order_id: orderId,
        customer_id: order.customer_id,
        amount: paymentForm.amount,
        payment_type: paymentForm.payment_type,
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date,
        notes: paymentForm.notes || null,
      });
      if (insertError) {
        console.error("Insert error:", insertError);
        alert("Failed to save payment: " + insertError.message);
        return;
      }
      const newTotalPaid = totalPayments + paymentForm.amount;
      // Use final_budget if set, otherwise use total_amount
      const budgetForBalance = order.final_budget || order.total_amount;
      const newBalance = budgetForBalance - newTotalPaid;
      await supabase.from("orders").update({
        amount_paid: newTotalPaid,
        balance_due: newBalance,
        payment_status: newBalance <= 0 ? "Paid" : newTotalPaid > 0 ? "Partial" : "Pending",
      }).eq("id", order.id);
      const { data } = await supabase.from("payments").select("*").eq("order_id", order.id).order("payment_date", { ascending: false });
      setPayments(data || []);
      const { data: updatedOrder } = await supabase.from("orders").select("*").eq("id", order.id).single();
      // Preserve final_budget from current state if database doesn't have the column yet
      if (updatedOrder) {
        setOrder({
          ...updatedOrder,
          final_budget: updatedOrder.final_budget ?? order.final_budget
        });
      }

      // Generate WhatsApp notification message
      const whatsappMessage = generatePaymentMessage(
        order.customer_name,
        order.event_type,
        order.event_date,
        paymentForm.amount,
        budgetForBalance,
        newBalance,
        paymentForm.payment_type
      );

      // Ask user if they want to send WhatsApp notification
      if (order.customer_phone && confirm(`Payment saved successfully!\n\nWould you like to send a WhatsApp notification to ${order.customer_name}?`)) {
        sendWhatsAppNotification(order.customer_phone, whatsappMessage);
      }

      setShowPaymentModal(false);
      setPaymentForm({ payment_type: "", payment_method: "", amount: 0, payment_date: new Date().toISOString().split("T")[0], notes: "" });
    } catch (error) {
      console.error("Error saving payment:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(amount);
  };

  // Generate Order PDF
  const generateOrderPDF = () => {
    if (!order) return;

    const workflowData: Record<string, string> = (() => {
      try {
        return order.workflow_status ? JSON.parse(order.workflow_status) : {};
      } catch {
        return {};
      }
    })();

    // Generate workflow items HTML
    const workflowItemsHtml = workflowStages.map(stage => {
      const status = workflowData[stage] || "No";
      const isComplete = status === "Yes" || status === "Not Needed";
      const className = isComplete ? "workflow-complete" : "workflow-pending";
      const color = isComplete ? "#16a34a" : "#dc2626";
      return '<div class="workflow-item ' + className + '"><div class="workflow-label" style="color: ' + color + '">' + stage + '</div><div class="workflow-status">' + status + '</div></div>';
    }).join("");

    // Generate items HTML
    const itemsHtml = items.map(item => {
      return '<tr><td>' + item.description + '</td><td>' + (item.category || "—") + '</td><td class="amount">' + item.quantity + '</td><td class="amount">₹' + item.total_price.toLocaleString() + '</td></tr>';
    }).join("");

    // Generate expenses HTML
    const expensesHtml = expenses.length > 0 
      ? expenses.map(expense => {
          return '<tr><td>' + expense.category + '</td><td>' + (expense.vendor_name || "—") + '</td><td>' + (expense.description || "—") + '</td><td class="amount">₹' + expense.amount.toLocaleString() + '</td></tr>';
        }).join("") + '<tr style="font-weight: bold; background: #fef2f2;"><td colspan="3">Total Expenses</td><td class="amount">₹' + totalExpenses.toLocaleString() + '</td></tr>'
      : '<tr><td colspan="4" style="text-align: center; color: #64748b;">No expenses recorded</td></tr>';

    // Generate payments HTML
    const paymentsHtml = payments.length > 0
      ? payments.map(payment => {
          return '<tr><td>' + payment.payment_number + '</td><td>' + formatDate(payment.payment_date) + '</td><td>' + payment.payment_method + '</td><td class="amount">₹' + payment.amount.toLocaleString() + '</td></tr>';
        }).join("") + '<tr style="font-weight: bold; background: #dcfce7;"><td colspan="3">Total Paid</td><td class="amount">₹' + totalPayments.toLocaleString() + '</td></tr>'
      : '<tr><td colspan="4" style="text-align: center; color: #64748b;">No payments recorded</td></tr>';

    const origin = window.location.origin;

    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Order - ' + order.order_number + '</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: #fff; } .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #5b1e2d; } .logo { font-size: 28px; font-weight: bold; color: #5b1e2d; } .logo-sub { font-size: 12px; color: #64748b; } .doc-info { text-align: right; } .doc-title { font-size: 24px; font-weight: bold; color: #1e293b; } .doc-number { font-size: 14px; color: #64748b; margin-top: 4px; } .section { margin-bottom: 25px; } .section-title { font-size: 14px; font-weight: 600; color: #5b1e2d; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; } .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; } .info-box { padding: 12px; background: #f8fafc; border-radius: 8px; } .info-label { font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; } .info-value { font-size: 14px; font-weight: 500; color: #1e293b; } .workflow-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; } .workflow-item { padding: 10px; border-radius: 8px; text-align: center; } .workflow-complete { background: #dcfce7; border: 1px solid #22c55e; } .workflow-pending { background: #fef2f2; border: 1px solid #ef4444; } .workflow-label { font-size: 11px; font-weight: 600; } .workflow-status { font-size: 10px; margin-top: 4px; } table { width: 100%; border-collapse: collapse; margin-top: 10px; } th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 13px; } th { background: #f1f5f9; font-weight: 600; color: #475569; } .amount { text-align: right; } .total-row { font-weight: bold; background: #5b1e2d; color: white; } .total-row td { border: none; } .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 20px; } .summary-box { padding: 15px; border-radius: 8px; text-align: center; } .summary-total { background: linear-gradient(135deg, #5b1e2d, #8b5cf6); color: white; } .summary-paid { background: #dcfce7; } .summary-expense { background: #fef2f2; } .summary-profit { background: #dbeafe; } .summary-value { font-size: 18px; font-weight: bold; margin-top: 4px; } .summary-label { font-size: 11px; opacity: 0.8; } .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; } @media print { body { padding: 20px; } }</style></head><body>' +
      '<div class="header"><div><img src="' + origin + '/ak-logo-final.png" alt="Aura Knot" style="height:48px; width:auto; display:block; margin-bottom:6px;" /><div class="logo-sub">Photography & Events</div></div><div class="doc-info"><div class="doc-title">ORDER DETAILS</div><div class="doc-number">' + order.order_number + '</div><div class="doc-number">Date: ' + formatDate(order.created_at) + '</div></div></div>' +
      '<div class="section"><div class="section-title">Customer & Event Information</div><div class="info-grid"><div class="info-box"><div class="info-label">Customer</div><div class="info-value">' + (order.customer_name || "N/A") + '</div><div style="font-size: 12px; color: #64748b; margin-top: 4px;">' + (order.customer_phone || "") + (order.customer_email ? " • " + order.customer_email : "") + '</div></div><div class="info-box"><div class="info-label">Event Details</div><div class="info-value">' + (order.event_type || "N/A") + '</div><div style="font-size: 12px; color: #64748b; margin-top: 4px;">' + formatDate(order.event_date) + (order.event_venue ? " • " + order.event_venue : "") + '</div></div></div></div>' +
      '<div class="section"><div class="section-title">Workflow Status</div><div class="workflow-grid">' + workflowItemsHtml + '</div></div>' +
      '<div class="section"><div class="section-title">Services & Items</div><table><thead><tr><th>Description</th><th>Category</th><th class="amount">Qty</th><th class="amount">Amount</th></tr></thead><tbody>' + itemsHtml + '<tr class="total-row"><td colspan="3">Total Order Amount</td><td class="amount">₹' + (order.total_amount || 0).toLocaleString() + '</td></tr></tbody></table></div>' +
      '<div class="section"><div class="section-title">Expenses</div><table><thead><tr><th>Category</th><th>Vendor</th><th>Description</th><th class="amount">Amount</th></tr></thead><tbody>' + expensesHtml + '</tbody></table></div>' +
      '<div class="section"><div class="section-title">Payments</div><table><thead><tr><th>Payment #</th><th>Date</th><th>Method</th><th class="amount">Amount</th></tr></thead><tbody>' + paymentsHtml + '</tbody></table></div>' +
      '<div class="summary-grid"><div class="summary-box summary-total"><div class="summary-label">Total Amount</div><div class="summary-value">₹' + (order.total_amount || 0).toLocaleString() + '</div></div><div class="summary-box summary-paid"><div class="summary-label">Amount Paid</div><div class="summary-value" style="color: #16a34a;">₹' + totalPayments.toLocaleString() + '</div></div><div class="summary-box summary-expense"><div class="summary-label">Total Expenses</div><div class="summary-value" style="color: #dc2626;">₹' + totalExpenses.toLocaleString() + '</div></div><div class="summary-box summary-profit"><div class="summary-label">Profit/Loss</div><div class="summary-value" style="color: ' + (profit >= 0 ? "#16a34a" : "#dc2626") + ';">₹' + Math.abs(profit).toLocaleString() + '</div></div></div>' +
      '<div style="margin-top: 20px; padding: 15px; background: ' + (balanceDue > 0 ? "#fef2f2" : "#dcfce7") + '; border-radius: 8px; text-align: center;"><div style="font-size: 12px; color: #64748b;">Balance Due</div><div style="font-size: 24px; font-weight: bold; color: ' + (balanceDue > 0 ? "#dc2626" : "#16a34a") + ';">₹' + balanceDue.toLocaleString() + '</div></div>' +
      '<div class="footer"><p>Aura Knot Photography • Generated on ' + new Date().toLocaleDateString("en-IN") + '</p></div></body></html>';

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => printWindow.print();
    }
  };

  const handleDeleteOrder = async () => {
    if (!supabase || !order) return;
    setDeleting(true);
    try {
      // Delete related records first
      await supabase.from("payments").delete().eq("order_id", order.id);
      await supabase.from("expenses").delete().eq("order_id", order.id);
      await supabase.from("order_items").delete().eq("order_id", order.id);
      // Delete the order
      const { error } = await supabase.from("orders").delete().eq("id", order.id);
      if (error) throw error;
      router.push("/orders");
    } catch (error) {
      console.error("Error deleting order:", error);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const inputClass = "h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";
  const selectClass = "h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent"></div>
          <p className="text-sm text-[var(--muted-foreground)]">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-lg text-[var(--muted-foreground)]">Order not found</p>
        <button onClick={() => router.push("/orders")} className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white">Back to Orders</button>
      </div>
    );
  }

  // ServiceItemCard: Shows individual service with its own expenses (category = service description)
  const ServiceItemCard = ({ item }: { item: OrderItem }) => {
    const serviceExpenses = getExpensesForService(item.description);
    const expenseTotal = getServiceExpenseTotal(item.description);
    const hasExpenses = serviceExpenses.length > 0;
    const profitLoss = item.total_price - expenseTotal;

    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {/* Service Header */}
        <div className="px-4 py-3 bg-[var(--secondary)]/50">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-[var(--foreground)]">{item.description}</h4>
              <p className="text-xs text-[var(--muted-foreground)]">{item.category} • Qty: {item.quantity}</p>
            </div>
            {/* Service Amount */}
            <div className="text-lg font-bold text-[var(--primary)]">
              {formatCurrency(item.total_price)}
            </div>
          </div>
        </div>

        {/* Expense Section - Directly below service */}
        <div className="bg-[var(--card)]">
          <div className="px-4 py-2 flex items-center justify-between border-t border-[var(--border)]">
            <span className="text-xs font-medium text-[var(--muted-foreground)]">💰 Expenses</span>
            <button
              onClick={() => handleOpenExpenseModal(item.description)}
              className="text-xs px-2 py-1 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90"
            >
              + Add
            </button>
          </div>

          {serviceExpenses.length > 0 ? (
            <div className="px-4 py-3 border-t border-[var(--border)]">
              <div className="space-y-2">
                {serviceExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between bg-[var(--secondary)]/50 rounded-lg px-3 py-2 border border-[var(--border)]">
                    <div className="flex-1">
                      <p className="text-sm text-[var(--foreground)]">{expense.vendor_name || "Vendor"}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{expense.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-amber-600">
                        -{formatCurrency(expense.amount)}
                      </span>
                      <button onClick={() => handleEditExpense(expense)} className="text-xs p-1 rounded bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--border)]">✏️</button>
                      <button onClick={() => handleDeleteExpense(expense.id)} className="text-xs p-1 rounded bg-[var(--secondary)] text-[var(--muted-foreground)] hover:bg-[var(--border)]">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Summary */}
              <div className="mt-3 flex items-center justify-between text-xs bg-[var(--secondary)]/50 rounded-lg p-2 border border-[var(--border)]">
                <div className="flex gap-4">
                  <span className="text-[var(--foreground)]">Service: <strong>{formatCurrency(item.total_price)}</strong></span>
                  <span className="text-amber-600">Expense: <strong>{formatCurrency(expenseTotal)}</strong></span>
                </div>
                <span className={profitLoss >= 0 ? "text-green-600" : "text-amber-600"}>
                  {profitLoss >= 0 ? "Profit" : "Loss"}: <strong>{formatCurrency(Math.abs(profitLoss))}</strong>
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)] text-center py-3 border-t border-[var(--border)]">No expenses recorded</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 xs:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1 xs:flex-row xs:items-start xs:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">Order Details</p>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{order.order_number}</h2>
          {editingCreatedDate ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                type="date"
                value={createdDateInput}
                onChange={(e) => setCreatedDateInput(e.target.value)}
                className="h-8 px-2 text-sm rounded border border-[var(--border)] bg-[var(--secondary)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              <button
                onClick={async () => {
                  if (!supabase) return;
                  
                  // Validation: created_at must be <= event_end_date
                  const eventEndDate = order.event_end_date || order.event_date;
                  if (createdDateInput > eventEndDate) {
                    alert("Order created date cannot be after the event date!");
                    return;
                  }
                  
                  try {
                    await supabase.from("orders").update({ created_at: createdDateInput }).eq("id", order.id);
                    setOrder({ ...order, created_at: createdDateInput });
                    setEditingCreatedDate(false);
                  } catch (error) {
                    console.error("Error updating created date:", error);
                  }
                }}
                className="p-1.5 rounded bg-green-500 text-white hover:bg-green-600"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setEditingCreatedDate(false);
                }}
                className="p-1.5 rounded bg-gray-400 text-white hover:bg-gray-500"
              >
                ✕
              </button>
            </div>
          ) : (
            <p 
              className="mt-1 text-sm text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] transition-colors"
              onClick={() => {
                const dateStr = new Date(order.created_at).toISOString().split('T')[0];
                setCreatedDateInput(dateStr);
                setEditingCreatedDate(true);
              }}
            >
              Created: <span className="font-medium text-[var(--foreground)]">{formatDate(order.created_at)}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
          <button
            onClick={() => {
              if (order.quotation_id) {
                router.push(`/quotation?editId=${order.quotation_id}`);
              } else {
                // No quotation - edit the order's services directly
                router.push(`/quotation?editOrderId=${order.id}`);
              }
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-600 hover:bg-blue-100 transition-all duration-200"
          >
            ✏️ Edit Order
          </button>
          <button
            onClick={generateOrderPDF}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/30"
          >
            📄 Download PDF
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 text-sm font-semibold text-white shadow-lg shadow-green-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-green-500/30"
          >
            💳 Add Payment
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 hover:bg-red-100 transition-all duration-200"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Workflow Status - Each stage has Yes/No/Not Needed dropdown */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
              📋 Workflow Status
            </h3>
            <p className="text-sm text-[var(--muted-foreground)]">Track completion of each production stage</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[var(--success)]"></span> Yes / Not Needed</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[var(--danger)]"></span> No</span>
          </div>
        </div>
        
        {/* Workflow Stages Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workflowStages.map((stage) => {
            // Parse workflow_status JSON or use default
            const workflowData: Record<string, string> = (() => {
              try {
                return order.workflow_status ? JSON.parse(order.workflow_status) : {};
              } catch {
                return {};
              }
            })();
            const stageStatus = workflowData[stage] || "No";
            const isGreen = stageStatus === "Yes" || stageStatus === "Not Needed";
            
            return (
              <div 
                key={stage} 
                className={`rounded-xl border-2 p-4 transition-all ${
                  isGreen 
                    ? "border-[var(--success)] bg-[var(--success)]/10" 
                    : "border-[var(--danger)]/50 bg-[var(--danger)]/10"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
                      isGreen ? "bg-[var(--success)]" : "bg-[var(--danger)]"
                    }`}>
                      {isGreen ? "✓" : "✗"}
                    </div>
                    <span className="text-sm font-medium text-[var(--foreground)]">{stage}</span>
                  </div>
                  <select
                    value={stageStatus}
                    onChange={async (e) => {
                      if (!supabase) return;
                      const newStatus = e.target.value;
                      const updatedData = { ...workflowData, [stage]: newStatus };
                      const jsonString = JSON.stringify(updatedData);
                      try {
                        await supabase.from("orders").update({ workflow_status: jsonString }).eq("id", order.id);
                        setOrder({ ...order, workflow_status: jsonString });
                        
                        // Show WhatsApp prompt if stage is marked as complete
                        if ((newStatus === "Yes" || newStatus === "Not Needed") && order.customer_phone) {
                          const workflowMessage = generateWorkflowMessage(
                            order.customer_name,
                            order.order_number,
                            stage,
                            order.event_type
                          );
                          
                          if (confirm(`Stage marked as complete!\n\nWould you like to send a WhatsApp notification to ${order.customer_name}?`)) {
                            sendWhatsAppNotification(order.customer_phone, workflowMessage);
                          }
                        }
                      } catch (error) {
                        console.error("Error updating workflow:", error);
                      }
                    }}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer appearance-none outline-none ${
                      stageStatus === "Yes" 
                        ? "bg-[var(--success)] text-white" 
                        : stageStatus === "Not Needed"
                        ? "bg-[var(--success)]/80 text-white"
                        : "bg-[var(--danger)] text-white"
                    }`}
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                    <option value="Not Needed">Not Needed</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-[var(--border)]/50 flex items-center justify-between">
          <div className="text-sm text-[var(--muted-foreground)]">
            {(() => {
              const workflowData: Record<string, string> = (() => {
                try {
                  return order.workflow_status ? JSON.parse(order.workflow_status) : {};
                } catch {
                  return {};
                }
              })();
              const completed = workflowStages.filter(s => workflowData[s] === "Yes" || workflowData[s] === "Not Needed").length;
              return `${completed} of ${workflowStages.length} stages completed`;
            })()}
          </div>
          <button
            onClick={async () => {
              if (!supabase || !confirm("Reset all workflow stages to No?")) return;
              await supabase.from("orders").update({ workflow_status: null }).eq("id", order.id);
              setOrder({ ...order, workflow_status: "" });
            }}
            className="text-xs text-[var(--danger)] hover:underline"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Order Completion Status */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
              ✅ Order Completion Status
            </h3>
            <p className="text-sm text-[var(--muted-foreground)]">Mark this order as complete to show profit in the dashboard</p>
          </div>
          <select
            value={order.order_completed || "No"}
            onChange={async (e) => {
              if (!supabase) return;
              const newStatus = e.target.value;
              try {
                await supabase.from("orders").update({ order_completed: newStatus }).eq("id", order.id);
                setOrder({ ...order, order_completed: newStatus });
                
                // Show WhatsApp notification if order is marked as completed
                if (newStatus === "Yes" && order.customer_phone) {
                  // Check if WhatsApp notifications are enabled for order completion
                  const whatsappSettings = (() => {
                    try {
                      return JSON.parse(localStorage.getItem("whatsapp_settings") || "{}");
                    } catch {
                      return {};
                    }
                  })();
                  
                  if (whatsappSettings.order_completion !== false) { // Default to true if not set
                    const completionMessage = generateOrderCompletionMessage(
                      order.customer_name,
                      order.order_number,
                      order.event_type
                    );
                    
                    if (confirm(`Order marked as complete!\n\nWould you like to send a WhatsApp notification to ${order.customer_name}?`)) {
                      sendWhatsAppNotification(order.customer_phone, completionMessage);
                    }
                  }
                }
              } catch (error) {
                console.error("Error updating order completion status:", error);
              }
            }}
            className={`text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer appearance-none outline-none ${
              order.order_completed === "Yes" 
                ? "bg-[var(--success)] text-white" 
                : "bg-[var(--danger)] text-white"
            }`}
            style={{ colorScheme: "dark" }}
          >
            <option value="No">Not Completed</option>
            <option value="Yes">Completed</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-2 xs:gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Estimated Budget" value={formatCurrency(order.total_amount)} />
        
        {/* Editable Final Budget */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)] mb-1">Final Budget</p>
          {editingFinalBudget ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={finalBudgetInput}
                onChange={(e) => setFinalBudgetInput(Number(e.target.value))}
                className="w-full h-8 px-2 text-lg font-bold rounded border border-[var(--border)] bg-[var(--secondary)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                autoFocus
              />
              <button
                onClick={async () => {
                  if (!supabase) return;
                  try {
                    const newBalance = finalBudgetInput - totalPayments;
                    await supabase.from("orders").update({ 
                      final_budget: finalBudgetInput,
                      balance_due: newBalance,
                      payment_status: newBalance <= 0 ? "Paid" : totalPayments > 0 ? "Partial" : "Pending"
                    }).eq("id", order.id);
                    setOrder({ ...order, final_budget: finalBudgetInput, balance_due: newBalance });
                    setEditingFinalBudget(false);
                  } catch (error) {
                    console.error("Error updating final budget:", error);
                  }
                }}
                className="p-1.5 rounded bg-green-500 text-white hover:bg-green-600"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setEditingFinalBudget(false);
                  setFinalBudgetInput(order.final_budget || order.total_amount);
                }}
                className="p-1.5 rounded bg-gray-400 text-white hover:bg-gray-500"
              >
                ✕
              </button>
            </div>
          ) : (
            <div 
              onClick={() => {
                setFinalBudgetInput(order.final_budget || order.total_amount);
                setEditingFinalBudget(true);
              }}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <p className={`text-2xl font-bold ${(order.final_budget || order.total_amount) !== order.total_amount ? 'text-blue-600' : 'text-[var(--foreground)]'}`}>
                {formatCurrency(order.final_budget || order.total_amount)}
              </p>
              <span className="text-xs text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
            </div>
          )}
          {(order.final_budget && order.final_budget !== order.total_amount) && (
            <p className="text-xs text-blue-600 mt-1">
              {order.final_budget > order.total_amount ? '+' : ''}{formatCurrency(order.final_budget - order.total_amount)} from estimate
            </p>
          )}
        </div>
        
        <StatCard label="Total Expenses" value={formatCurrency(totalExpenses)} trend="neutral" />
        <StatCard label="Profit" value={formatCurrency(profit)} trend={profit >= 0 ? "up" : "down"} />
        <StatCard label="Balance Due" value={formatCurrency(balanceDue)} trend={balanceDue > 0 ? "down" : "up"} />
      </div>

      {/* Customer & Event Info */}
      <SectionCard title="Customer & Event Information" description="Frozen snapshot from confirmed quotation">
        <div className="grid gap-2 xs:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50 p-3">
            <p className="text-xs text-[var(--muted-foreground)]">Customer Name</p>
            <p className="font-medium text-[var(--foreground)]">{order.customer_name || customer?.name || "—"}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50 p-3">
            <p className="text-xs text-[var(--muted-foreground)]">Phone</p>
            <p className="font-medium text-[var(--foreground)]">{order.customer_phone || customer?.phone || "—"}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50 p-3">
            <p className="text-xs text-[var(--muted-foreground)]">Event Type</p>
            <p className="font-medium text-[var(--foreground)]">{order.event_type || "—"}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50 p-3">
            <p className="text-xs text-[var(--muted-foreground)]">Event Date</p>
            <p className="font-medium text-[var(--foreground)]">{formatDate(order.event_date)}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50 p-3 sm:col-span-2">
            <p className="text-xs text-[var(--muted-foreground)]">Venue</p>
            <p className="font-medium text-[var(--foreground)]">{order.event_venue || "—"}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50 p-3">
            <p className="text-xs text-[var(--muted-foreground)]">City</p>
            <p className="font-medium text-[var(--foreground)]">{order.event_city || "—"}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50 p-3">
            <p className="text-xs text-[var(--muted-foreground)]">Package</p>
            <p className="font-medium text-[var(--foreground)]">{order.package_type || "—"}</p>
          </div>
        </div>
        {order.quotation_id && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-700">
            <span>📄</span>
            <span>
              Linked to Quotation • Order Status: <span className="font-medium">{order.status}</span> • Payment: <span className="font-medium">{order.payment_status}</span>
            </span>
          </div>
        )}
      </SectionCard>

      {/* Tabs */}
      <div className="flex gap-1 xs:gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto">
        {(["overview", "payments"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
            }`}
          >
            {tab === "overview" ? "📋 Quotation Details" : "💳 Payments"}
          </button>
        ))}
      </div>

      {/* Quotation Tab - Services, Deliverables & Expenses in one place */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-4 xs:gap-6">
          {/* Quotation Pricing Summary */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
              📄 Quotation Pricing
            </h3>
            <div className="grid gap-2 xs:gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center p-4 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Subtotal</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{formatCurrency(order.subtotal || order.total_amount)}</p>
              </div>
              <div className="text-center p-4 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50">
                <p className="text-xs text-green-600 mb-1">Discount ({order.discount_percent || 0}%)</p>
                <p className="text-xl font-bold text-green-600">-{formatCurrency(order.discount_amount || 0)}</p>
              </div>
              <div className="text-center p-4 bg-[var(--primary)] rounded-xl text-white">
                <p className="text-xs mb-1 opacity-90">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(order.total_amount)}</p>
              </div>
              <div className="text-center p-4 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50">
                <p className="text-xs text-amber-600 mb-1">Balance Due</p>
                <p className={`text-xl font-bold ${balanceDue <= 0 ? "text-green-600" : "text-amber-600"}`}>
                  {formatCurrency(balanceDue)}
                </p>
              </div>
            </div>
          </div>

          {/* Deliverables Section */}
          {(order.num_albums > 0 || order.total_photos > 0 || order.mini_books > 0 || order.calendars > 0 || order.frames > 0) && (
            <SectionCard title="📦 Deliverables" description="Albums, photos, and print items">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {order.num_albums > 0 && (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/30">
                    <span className="text-2xl">📚</span>
                    <div>
                      <p className="text-lg font-bold text-[var(--foreground)]">{order.num_albums}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">Albums ({order.album_size || "—"})</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{order.sheets_per_album || 0} sheets each</p>
                    </div>
                  </div>
                )}
                {order.total_photos > 0 && (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/30">
                    <span className="text-2xl">🖼️</span>
                    <div>
                      <p className="text-lg font-bold text-[var(--foreground)]">{order.total_photos}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">Soft Copies</p>
                    </div>
                  </div>
                )}
                {order.mini_books > 0 && (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/30">
                    <span className="text-2xl">📖</span>
                    <div>
                      <p className="text-lg font-bold text-[var(--foreground)]">{order.mini_books}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">Mini Books</p>
                    </div>
                  </div>
                )}
                {order.calendars > 0 && (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/30">
                    <span className="text-2xl">📅</span>
                    <div>
                      <p className="text-lg font-bold text-[var(--foreground)]">{order.calendars}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">Calendars</p>
                    </div>
                  </div>
                )}
                {order.frames > 0 && (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/30">
                    <span className="text-2xl">🖼️</span>
                    <div>
                      <p className="text-lg font-bold text-[var(--foreground)]">{order.frames}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">Frames</p>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* All Service Items - Each with its own expense section */}
          {items.length > 0 && (
            <SectionCard title="📸 Services & Expenses" description="Photography, videography & additional services with expenses">
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((item) => (
                  <ServiceItemCard key={item.id} item={item} />
                ))}
              </div>
            </SectionCard>
          )}

          {/* Post Production Expenses - Default for all orders */}
          <SectionCard title="🎬 Post Production Expenses" description="Editing, designing & production costs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--muted-foreground)]">
                  {getPostProdExpenses().length} expense{getPostProdExpenses().length !== 1 ? "s" : ""} • Total: <strong className="text-red-600">{formatCurrency(postProdExpenseTotal)}</strong>
                </span>
              </div>
              <button
                onClick={() => handleOpenPostProdModal()}
                className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                + Add Post Production Expense
              </button>
            </div>

            {/* Category Cards */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {postProdCategories.map((category) => {
                const categoryExpenses = expenses.filter((e) => e.category === category);
                const categoryTotal = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);

                return (
                  <div key={category} className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                    <div className="px-3 py-2 flex items-center justify-between bg-[var(--secondary)]/50">
                      <span className="text-sm font-medium text-[var(--foreground)]">{category}</span>
                      <button
                        onClick={() => handleOpenPostProdModal(category)}
                        className="text-xs px-2 py-0.5 rounded bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90"
                      >
                        +
                      </button>
                    </div>
                    {categoryExpenses.length > 0 ? (
                      <div className="p-2 space-y-1 border-t border-[var(--border)]">
                        {categoryExpenses.map((expense) => (
                          <div key={expense.id} className="flex items-center justify-between bg-[var(--secondary)]/50 rounded-lg px-2 py-1.5 border border-[var(--border)]">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-[var(--foreground)] truncate">{expense.vendor_name || "—"}</p>
                              {expense.description && <p className="text-xs text-[var(--muted-foreground)] truncate">{expense.description}</p>}
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <span className="text-xs font-semibold text-amber-600">
                                {formatCurrency(expense.amount)}
                              </span>
                              <button onClick={() => handleEditPostProdExpense(expense)} className="text-xs p-0.5 rounded bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--border)]">✏️</button>
                              <button onClick={() => handleDeleteExpense(expense.id)} className="text-xs p-0.5 rounded bg-[var(--secondary)] text-[var(--muted-foreground)] hover:bg-[var(--border)]">🗑️</button>
                            </div>
                          </div>
                        ))}
                        <div className="text-right mt-1">
                          <span className="text-xs font-semibold text-[var(--foreground)]">Subtotal: {formatCurrency(categoryTotal)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--muted-foreground)] text-center py-3 border-t border-[var(--border)]">No expenses</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Post Production Summary */}
            {getPostProdExpenses().length > 0 && (
              <div className="mt-4 rounded-xl bg-[var(--secondary)]/50 border border-[var(--border)] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--foreground)]">Total Post Production Expenses</span>
                  <span className="text-xl font-bold text-amber-600">{formatCurrency(postProdExpenseTotal)}</span>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Miscellaneous Section - Common field for all orders */}
          <SectionCard title="📝 Miscellaneous" description="General notes, items, and other expenses">
            <div className="space-y-4">
              {/* Miscellaneous Notes Field */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--secondary)]/30 p-4">
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">Order Notes</label>
                <textarea
                  value={order?.notes || ""}
                  onChange={async (e) => {
                    if (!supabase || !order) return;
                    const newNotes = e.target.value;
                    setOrder({ ...order, notes: newNotes });
                    try {
                      await supabase.from("orders").update({ notes: newNotes }).eq("id", order.id);
                    } catch (error) {
                      console.error("Error updating notes:", error);
                    }
                  }}
                  placeholder="Add any miscellaneous notes, special requests, or additional information about this order..."
                  className="w-full h-24 p-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              {/* Miscellaneous Expenses */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between bg-[var(--secondary)]/50">
                  <span className="text-sm font-medium text-[var(--foreground)]">Miscellaneous Expenses</span>
                  <button
                    onClick={() => {
                      setExpenseForm({
                        category: "Miscellaneous",
                        vendor_name: "",
                        amount: 0,
                        expense_date: new Date().toISOString().split("T")[0],
                        description: "",
                        order_item_id: "",
                      });
                      setShowPostProdExpenseModal(true);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90"
                  >
                    + Add Miscellaneous Expense
                  </button>
                </div>

                {(() => {
                  const miscExpenses = expenses.filter((e) => e.category === "Miscellaneous");
                  const miscTotal = miscExpenses.reduce((sum, e) => sum + e.amount, 0);
                  
                  return miscExpenses.length > 0 ? (
                    <div className="px-4 py-3 border-t border-[var(--border)]">
                      <div className="space-y-3">
                        {miscExpenses.map((expense) => (
                          <div key={expense.id} className="flex items-center justify-between bg-[var(--secondary)]/50 rounded-lg px-4 py-3 border border-[var(--border)]">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-[var(--foreground)]">{expense.vendor_name || "Miscellaneous Item"}</p>
                              {expense.description && (
                                <p className="text-xs text-[var(--muted-foreground)]">{expense.description}</p>
                              )}
                              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                                Date: {formatDate(expense.expense_date)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 ml-4">
                              <span className="text-sm font-bold text-amber-600">
                                {formatCurrency(expense.amount)}
                              </span>
                              <button 
                                onClick={() => handleEditExpense(expense)} 
                                className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteExpense(expense.id)} 
                                className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--foreground)]">Total Miscellaneous</span>
                        <span className="text-lg font-bold text-amber-600">{formatCurrency(miscTotal)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--muted-foreground)] text-center py-6 border-t border-[var(--border)]">
                      No miscellaneous expenses added yet
                    </p>
                  );
                })()}
              </div>
            </div>
          </SectionCard>

          {/* Order Summary */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-[var(--foreground)] mb-4">📊 Order Summary</h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <div className="text-center p-3 rounded-xl bg-[var(--secondary)]/50 border border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)]">Estimated Budget</p>
                <p className="text-xl font-bold text-[var(--foreground)]">{formatCurrency(order.total_amount)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-[var(--secondary)]/50 border border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)]">Final Budget</p>
                <p className="text-xl font-bold text-[var(--primary)]">{formatCurrency(order.final_budget || order.total_amount)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-[var(--secondary)]/50 border border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)]">Service Expenses</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(serviceExpensesTotal)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-[var(--secondary)]/50 border border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)]">Post Prod Expenses</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(postProdExpenseTotal)}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-[var(--secondary)]/50 border border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)]">{profit >= 0 ? "Profit" : "Loss"}</p>
                <p className={`text-2xl font-bold ${profit >= 0 ? "text-green-600" : "text-amber-600"}`}>{formatCurrency(Math.abs(profit))}</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-[var(--secondary)]/50 border border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)]">Balance Due</p>
                <p className={`text-2xl font-bold ${balanceDue > 0 ? "text-amber-600" : "text-green-600"}`}>{formatCurrency(balanceDue)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === "payments" && (
        <div className="flex flex-col gap-6">
          <SectionCard title="💳 Payment History" description="Track all payments for this order">
            {payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Payment #</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Method</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Notes</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--secondary)]/30">
                        <td className="py-3 px-4 text-sm font-mono text-[var(--primary)]">{payment.payment_number}</td>
                        <td className="py-3 px-4 text-sm text-[var(--foreground)]">{formatDate(payment.payment_date)}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center rounded-full bg-[var(--secondary)] px-2 py-0.5 text-xs font-medium text-[var(--foreground)]">{payment.payment_method}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--muted-foreground)]">{payment.notes || "—"}</td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-green-600">+{formatCurrency(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[var(--secondary)]">
                      <td colSpan={4} className="py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Total Received</td>
                      <td className="py-3 px-4 text-sm text-right font-bold text-green-600">+{formatCurrency(totalPayments)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-[var(--muted-foreground)] mb-4">No payments recorded yet</p>
                <button onClick={() => setShowPaymentModal(true)} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-sm font-medium text-white">
                  + Record First Payment
                </button>
              </div>
            )}
          </SectionCard>

          <SectionCard title="📊 Payment Summary" description="Order payment status">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/50 p-4 text-center">
                <p className="text-xs text-[var(--muted-foreground)] font-medium">Total Amount</p>
                <p className="text-2xl font-bold text-[var(--foreground)]">{formatCurrency(order.total_amount)}</p>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                <p className="text-xs text-green-600 font-medium">Amount Paid</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totalPayments)}</p>
              </div>
              <div className={`rounded-xl border p-4 text-center ${balanceDue <= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                <p className={`text-xs font-medium ${balanceDue <= 0 ? "text-green-600" : "text-red-600"}`}>Balance Due</p>
                <p className={`text-2xl font-bold ${balanceDue <= 0 ? "text-green-700" : "text-red-700"}`}>{formatCurrency(balanceDue)}</p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Expense Modal - Simplified: Service, Vendor Name, Description, Amount */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              {editingExpense ? "Edit Expense" : "Add Expense"}
            </h3>
            <div className="grid gap-4">
              {/* Service (Category) - Matches service descriptions */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Service</label>
                <select className={selectClass} value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                  <option value="">Select service</option>
                  {getServiceCategories().map((service) => (<option key={service} value={service}>{service}</option>))}
                </select>
                {selectedServiceCategory && (
                  <p className="text-xs text-[var(--muted-foreground)]">Pre-selected: {selectedServiceCategory}</p>
                )}
              </div>
              {/* Vendor Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Vendor Name</label>
                <input type="text" placeholder="Vendor or supplier name" className={inputClass} value={expenseForm.vendor_name} onChange={(e) => setExpenseForm({ ...expenseForm, vendor_name: e.target.value })} />
              </div>
              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Description</label>
                <input type="text" placeholder="Brief note about this expense" className={inputClass} value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} />
              </div>
              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Expense Amount (₹)</label>
                <input type="number" placeholder="0" className={inputClass} value={expenseForm.amount || ""} onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowExpenseModal(false);
                  setEditingExpense(null);
                  setSelectedServiceCategory("");
                  setExpenseForm({ category: "", vendor_name: "", amount: 0, expense_date: new Date().toISOString().split("T")[0], description: "", order_item_id: "" });
                }}
                className="h-10 px-4 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
              >
                Cancel
              </button>
              <button onClick={handleSaveExpense} className="h-10 px-4 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white hover:bg-[var(--primary)]/90">
                {editingExpense ? "Update Expense" : "Save Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Production Expense Modal */}
      {showPostProdExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              {editingExpense ? "Edit Post Production Expense" : "Add Post Production Expense"}
            </h3>
            <div className="grid gap-4">
              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Category</label>
                <select className={selectClass} value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                  <option value="">Select category</option>
                  {postProdCategories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
              </div>
              {/* Vendor Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Vendor Name</label>
                <input type="text" placeholder="Editor, designer, or studio name" className={inputClass} value={expenseForm.vendor_name} onChange={(e) => setExpenseForm({ ...expenseForm, vendor_name: e.target.value })} />
              </div>
              {/* Description - Required for Miscellaneous */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Description {expenseForm.category === "Miscellaneous" && <span className="text-red-500">*</span>}
                </label>
                <input 
                  type="text" 
                  placeholder={expenseForm.category === "Miscellaneous" ? "Required: describe this expense" : "Brief note about this expense"} 
                  className={inputClass} 
                  value={expenseForm.description} 
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} 
                />
              </div>
              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Amount (₹)</label>
                <input type="number" placeholder="0" className={inputClass} value={expenseForm.amount || ""} onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPostProdExpenseModal(false);
                  setEditingExpense(null);
                  setExpenseForm({ category: "", vendor_name: "", amount: 0, expense_date: new Date().toISOString().split("T")[0], description: "", order_item_id: "" });
                }}
                className="h-10 px-4 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePostProdExpense} 
                disabled={expenseForm.category === "Miscellaneous" && !expenseForm.description}
                className="h-10 px-4 rounded-xl bg-purple-600 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingExpense ? "Update Expense" : "Save Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--card)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Record Payment</h3>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">Payment Type</label>
                  <select className={selectClass} value={paymentForm.payment_type} onChange={(e) => setPaymentForm({ ...paymentForm, payment_type: e.target.value })}>
                    <option value="">Select type</option>
                    {paymentTypes.map((type) => (<option key={type} value={type}>{type}</option>))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">Payment Method</label>
                  <select className={selectClass} value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}>
                    <option value="">Select method</option>
                    {paymentMethods.map((method) => (<option key={method} value={method}>{method}</option>))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">Amount (INR)</label>
                  <input type="number" placeholder="0" className={inputClass} value={paymentForm.amount || ""} onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">Date</label>
                  <input type="date" className={inputClass} value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Notes</label>
                <input type="text" placeholder="Payment reference or notes" className={inputClass} value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
              </div>
              <div className="rounded-lg bg-[var(--secondary)] p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted-foreground)]">Balance Due:</span>
                  <span className="font-semibold text-[var(--foreground)]">{formatCurrency(balanceDue)}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentForm({ payment_type: "", payment_method: "", amount: 0, payment_date: new Date().toISOString().split("T")[0], notes: "" });
                }}
                className="h-10 px-4 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
              >
                Cancel
              </button>
              <button onClick={handleSavePayment} className="h-10 px-4 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white hover:bg-[var(--primary)]/90">
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--card)] p-6 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-3xl">
                ⚠️
              </div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Delete Order?</h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Are you sure you want to delete order <span className="font-semibold text-[var(--foreground)]">{order.order_number}</span>? This will also delete all related payments and expenses. This action cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--secondary)] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOrder}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}