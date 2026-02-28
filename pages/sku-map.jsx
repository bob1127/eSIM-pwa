// app/sku-map/page.tsx
import PLAN_ID_MAP from "@/lib/esim/planMap";

export default function SkuMapPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">SKU 對照表</h1>
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">商品名稱</th>
            <th className="border p-2 text-left">channel_dataplan_id</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(PLAN_ID_MAP).map(([name, id]) => (
            <tr key={name}>
              <td className="border p-2">{name}</td>
              <td className="border p-2 font-mono">{id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
