"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getStaffOrders,
  updateStaffOrderStatus,
  type StaffAccess,
  type StaffOrder,
} from "@/lib/societypool";
import type { Database } from "@/lib/database.types";
import styles from "./staff-orders.module.css";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type Filter = "all" | "needs-action" | "completed";

const statusLabels: Record<OrderStatus, string> = {
  pending_confirmation: "Needs confirmation",
  confirmed: "Confirmed",
  packed: "Packed",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
  refund_pending: "Refund pending",
  refunded: "Refunded",
};

function availableActions(order: StaffOrder, access: StaffAccess): Array<{ status: OrderStatus; label: string }> {
  if (access.kind === "supplier") {
    if (order.status === "confirmed") return [{ status: "packed", label: "Mark packed" }];
    if (order.status === "packed") return [
      { status: "ready_for_pickup", label: "Ready for pickup" },
      { status: "out_for_delivery", label: "Out for delivery" },
    ];
    if (order.status === "ready_for_pickup" || order.status === "out_for_delivery") {
      return [{ status: "completed", label: "Mark completed" }];
    }
    return [];
  }

  if (order.status === "pending_confirmation") return [{ status: "confirmed", label: "Confirm order" }];
  if (order.status === "confirmed") return [{ status: "packed", label: "Mark packed" }];
  if (order.status === "packed") return [
    { status: "ready_for_pickup", label: "Ready for pickup" },
    { status: "out_for_delivery", label: "Out for delivery" },
  ];
  if (order.status === "ready_for_pickup" || order.status === "out_for_delivery") {
    return [{ status: "completed", label: "Mark completed" }];
  }
  if (order.status === "refund_pending") return [{ status: "refunded", label: "Mark refunded" }];
  return [];
}

export default function StaffOrders({ access }: { access: StaffAccess }) {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await getStaffOrders(access));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load staff orders.");
    } finally {
      setLoading(false);
    }
  }, [access]);

  useEffect(() => {
    let current = true;
    getStaffOrders(access)
      .then((loadedOrders) => {
        if (current) {
          setOrders(loadedOrders);
          setMessage("");
        }
      })
      .catch((error: unknown) => {
        if (current) setMessage(error instanceof Error ? error.message : "Could not load staff orders.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [access]);

  const filteredOrders = useMemo(() => orders.filter((order) => {
    if (filter === "completed") return order.status === "completed";
    if (filter === "needs-action") return availableActions(order, access).length > 0;
    return true;
  }), [access, filter, orders]);

  async function changeStatus(orderId: string, status: OrderStatus) {
    setBusyId(orderId);
    setMessage("");
    try {
      await updateStaffOrderStatus(orderId, status);
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
      setMessage(`Order updated to ${statusLabels[status].toLowerCase()}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update this order.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={`panel ${styles.staffPanel}`} aria-labelledby="staff-title">
      <div className={`panel-title ${styles.staffTitleRow}`}>
        <div>
          <small>{access.kind === "supplier" ? "SUPPLIER DESK" : "SOCIETY ADMIN"}</small>
          <h2 id="staff-title">Order management</h2>
          <p>{access.displayName} · Keep every neighbour in the loop.</p>
        </div>
        <button className="outline-button" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh orders"}
        </button>
      </div>

      <div className={styles.staffSummary}>
        <div><small>ORDERS IN VIEW</small><b>{orders.length}</b></div>
        <div><small>NEEDING ACTION</small><b>{orders.filter((order) => availableActions(order, access).length > 0).length}</b></div>
        <div><small>COMPLETED</small><b>{orders.filter((order) => order.status === "completed").length}</b></div>
      </div>

      <div className={styles.staffToolbar} role="group" aria-label="Filter orders">
        {(["all", "needs-action", "completed"] as Filter[]).map((option) => (
          <button key={option} className={filter === option ? styles.active : ""} onClick={() => setFilter(option)}>
            {option === "all" ? "All orders" : option === "needs-action" ? "Needs action" : "Completed"}
          </button>
        ))}
        <span className={styles.staffCount}>{filteredOrders.length} shown</span>
      </div>

      {message && <p className="backend-message" role="status">{message}</p>}
      {loading ? <p className={styles.staffEmpty}>Loading orders…</p> : filteredOrders.length ? (
        <div className={styles.staffOrderList}>
          {filteredOrders.map((order) => {
            const actions = availableActions(order, access);
            return (
              <article className={styles.staffOrder} key={order.id}>
                <div className={styles.staffOrderMain}>
                  <div className={styles.staffOrderIcon}>{order.quantity}</div>
                  <div className={styles.staffOrderCopy}>
                    <b>{order.productName}</b>
                    <span>{order.unitSize} · Order {order.id.slice(0, 8).toUpperCase()}</span>
                    <small>
                      {order.societyName ?? `Society ${order.societyId.slice(0, 6)}`} · Resident #{order.residentId.slice(0, 6)} · {new Date(order.createdAt).toLocaleString()}
                    </small>
                  </div>
                  <div className={styles.staffOrderTotal}>
                    <b>₹{order.total.toLocaleString("en-IN")}</b>
                    <span>{statusLabels[order.status]}</span>
                  </div>
                </div>
                {actions.length > 0 && (
                  <div className={styles.staffActions}>
                    {actions.map((action) => (
                      <button
                        key={action.status}
                        className="button-primary"
                        disabled={busyId === order.id}
                        onClick={() => void changeStatus(order.id, action.status)}
                      >
                        {busyId === order.id ? "Updating…" : action.label}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.staffEmpty}>
          <b>{orders.length ? "No orders in this view." : "No orders assigned yet."}</b>
          <span>{orders.length ? "Choose another filter to see more." : "Orders will appear here when residents place them."}</span>
        </div>
      )}
    </section>
  );
}
