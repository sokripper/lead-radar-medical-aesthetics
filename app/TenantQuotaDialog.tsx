"use client";
import { useEffect, useRef, useState } from "react";
import type { Tenant } from "./project-management";
import { quotaRemaining, type QuotaModel } from "./account-management";
export default function TenantQuotaDialog({
  tenant,
  onClose,
  onAllocate,
}: {
  tenant: Tenant;
  onClose: () => void;
  onAllocate: (amounts: Record<QuotaModel, number>) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [amounts, setAmounts] = useState({ A: "", G: "" });
  const [error, setError] = useState("");
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="tenant-quota-dialog"
      aria-labelledby="tenant-quota-title"
      onCancel={onClose}
    >
      <header>
        <div>
          <h2 id="tenant-quota-title">分配租户额度</h2>
          <p>{tenant.name}</p>
        </div>
        <button
          className="icon-button"
          aria-label="关闭额度弹窗"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <p className="directory-muted">
        填写本次增加的次数，额度由该租户下的项目共享。
      </p>
      <div className="tenant-quota-fields">
        {(["A", "G"] as const).map((model) => (
          <label key={model}>
            <strong>{model} 类模型</strong>
            <span>
              当前可用{" "}
              {quotaRemaining(tenant.shared.quota, model).toLocaleString()} 次
            </span>
            <div>
              <input
                autoFocus={model === "A"}
                aria-label={`${model} 类模型本次增加额度`}
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={amounts[model]}
                onChange={(e) => {
                  setAmounts({ ...amounts, [model]: e.target.value });
                  setError("");
                }}
              />
              <span>次</span>
            </div>
            <small>
              分配后可用{" "}
              {(
                quotaRemaining(tenant.shared.quota, model) +
                Math.max(0, Number(amounts[model]) || 0)
              ).toLocaleString()}{" "}
              次
            </small>
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="directory-error">
          {error}
        </p>
      )}
      <footer>
        <button className="button secondary" onClick={onClose}>
          取消
        </button>
        <button
          className="button primary"
          onClick={() => {
            const values = { A: Number(amounts.A), G: Number(amounts.G) };
            if (
              Object.values(values).some(
                (v) => !Number.isSafeInteger(v) || v < 0,
              ) ||
              !Object.values(values).some((v) => v > 0)
            ) {
              setError("请至少填写一项正整数额度，未分配的模型可留空。");
              return;
            }
            if (
              (["A", "G"] as const).some(
                (m) =>
                  !Number.isSafeInteger(
                    tenant.shared.quota[m].total + values[m],
                  ),
              )
            ) {
              setError("分配额度过大，请重新填写。");
              return;
            }
            onAllocate(values);
          }}
        >
          确认分配
        </button>
      </footer>
    </dialog>
  );
}
