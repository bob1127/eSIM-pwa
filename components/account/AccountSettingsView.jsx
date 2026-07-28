"use client";

import { MemberProfileHeader, NavyPanel, InnerTabs, ACCENT, AccountPageWrap } from "./AccountShell";
import MaterialIcon from "@/components/MaterialIcon";
import { useState } from "react";
import { formatMemberEmailDisplay, isLineSyntheticEmail } from "@/lib/lineAuth";

export default function AccountSettingsView({
  user,
  userRole,
  partnerData = null,
  editingName,
  setEditingName,
  editingPhone,
  setEditingPhone,
  newPassword,
  setNewPassword,
  savingProfile,
  savingPassword,
  onProfileUpdate,
  onPasswordUpdate,
  supabaseUser,
}) {
  const [tab, setTab] = useState("profile");

  return (
    <AccountPageWrap>
      <MemberProfileHeader
        user={user}
        userRole={userRole}
        partnerData={partnerData}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)] gap-6 xl:gap-8">
        <aside className="xl:pt-1">
          <InnerTabs
            tabs={[
              { id: "profile", label: "基本資料" },
              { id: "security", label: "登入安全" },
            ]}
            active={tab}
            onChange={setTab}
          />
        </aside>

        <div className="min-w-0">
          {tab === "profile" && (
            <NavyPanel
              title="編輯個人資料"
              icon="person"
              action={
                supabaseUser && (
                  <button
                    type="button"
                    onClick={onProfileUpdate}
                    disabled={savingProfile}
                    className="text-xs font-bold text-white px-4 py-1.5 rounded-sm disabled:opacity-50"
                    style={{ backgroundColor: ACCENT.primary }}
                  >
                    {savingProfile ? "儲存中…" : "儲存變更"}
                  </button>
                )
              }
            >
              <div className="grid gap-5 sm:grid-cols-2 max-w-3xl">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
                    顯示名稱
                  </label>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    disabled={!supabaseUser}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-sm text-sm disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0071EB]/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
                    Email
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formatMemberEmailDisplay(user?.email)}
                    className="w-full px-3 py-2.5 border border-slate-100 bg-slate-50 rounded-sm text-sm text-slate-500"
                  />
                  {isLineSyntheticEmail(user?.email) && (
                    <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
                      LINE 登入通常不會提供真實 Email，系統會以虛擬信箱辨識帳號與訂單。
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
                    手機
                  </label>
                  <input
                    type="tel"
                    value={editingPhone}
                    onChange={(e) => setEditingPhone(e.target.value)}
                    disabled={!supabaseUser}
                    placeholder="選填"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-sm text-sm disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0071EB]/30"
                  />
                </div>
                {!supabaseUser && (
                  <div className="sm:col-span-2 flex gap-2 p-3 rounded-sm bg-amber-50 border border-amber-100 text-xs text-amber-800">
                    <MaterialIcon name="info" size={18} className="shrink-0" />
                    您以 LINE 登入，個人資料請至 LINE 帳戶設定修改。
                  </div>
                )}
              </div>
            </NavyPanel>
          )}

          {tab === "security" && (
            <>
              {supabaseUser ? (
                <NavyPanel title="變更密碼" icon="lock">
                  <div className="max-w-md space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">
                        新密碼
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="至少 6 字"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#0071EB]/30"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={onPasswordUpdate}
                      disabled={savingPassword || !newPassword}
                      className="px-5 py-2.5 text-white text-sm font-bold rounded-sm disabled:opacity-50"
                      style={{ backgroundColor: ACCENT.sidebar }}
                    >
                      {savingPassword ? "更新中…" : "更新密碼"}
                    </button>
                  </div>
                </NavyPanel>
              ) : (
                <NavyPanel title="登入方式" icon="shield">
                  <p className="text-sm text-slate-600">
                    您目前使用 LINE 帳號登入，密碼管理請至 LINE 應用程式設定。
                  </p>
                </NavyPanel>
              )}
            </>
          )}
        </div>
      </div>
    </AccountPageWrap>
  );
}
