"use client";

export type ToastType = "success" | "error";
type Listener = (msg: string, type: ToastType) => void;

const listeners: Listener[] = [];

export function showToast(msg: string, type: ToastType = "success") {
  listeners.forEach((l) => l(msg, type));
}

export function onToast(listener: Listener) {
  listeners.push(listener);
  return () => {
    const i = listeners.indexOf(listener);
    if (i > -1) listeners.splice(i, 1);
  };
}
