import { useEffect } from "react";
import { useCart } from "./context/CartContext";
import { motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@heroui/react";
import Link from "next/link";

const Sidebar = () => {
  const {
    cartItems,
    totalPrice,
    removeFromCart,
    updateQuantity,
    isOpen,
    setIsOpen,
  } = useCart();

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
    console.log("Toggle Sidebar, isOpen:", !isOpen);
  };

  useEffect(() => {
    const handleOpenSidebar = () => {
      setIsOpen(true);
    };
    window.addEventListener("open-cart-sidebar", handleOpenSidebar);
    return () => {
      window.removeEventListener("open-cart-sidebar", handleOpenSidebar);
    };
  }, []);

  useEffect(() => {
    console.log("Sidebar state updated, isOpen:", isOpen);
  }, [isOpen]);

  const getWooCommerceFormData = () => {
    const addToCartIds = [];
    const quantities = [];

    cartItems.forEach((item) => {
      addToCartIds.push(item.id);
      quantities.push(item.quantity);
    });

    return { addToCartIds, quantities };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { addToCartIds, quantities } = getWooCommerceFormData();
    let url = "https://starislandbaby.com/test/Cart/?add-to-cart=";
    url += addToCartIds.join(",");
    url += "&quantity=" + quantities.join(",");
    console.log("生成的 URL:", url);
    window.location.href = url;
  };

  return (
    <div className="bg-gray-200 fixed w-[100vw] z-[99999999999] right-0 top-[0%]">
      <div className="relative w-full flex">
        <motion.div
          className="sidebar absolute z-[99999999] top-0 p-5 right-[-10%] w-full sm:w-[400px] pl-[50px] bg-white border border-gray-100 shadow-2xl h-screen"
          initial={{ x: "100%" }}
          animate={{ x: isOpen ? 0 : "100%" }}
          transition={{ duration: 0.3 }}
          onAnimationComplete={() =>
            console.log(`Sidebar animation completed. isOpen: ${isOpen}`)
          }
        >
          <button
            onClick={toggleSidebar}
            className="absolute top-4 left-4 z-50 text-gray-600 hover:text-black"
            aria-label="關閉購物車"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {cartItems.length === 0 ? (
            <p>您的購物車是空的</p>
          ) : (
            <ul className="overflow-hidden relative flex flex-col">
              {cartItems.map((item, index) => (
                <li
                  key={index}
                  className="flex px-5 justify-center items-center w-full overflow-scroll !border-gray-200 gap-4 border-b py-2"
                >
                  <div className="img-wrap w-1/2">
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={250}
                      height={250}
                      className="max-w-[100px]"
                      placeholder="empty"
                      loading="lazy"
                    />
                  </div>
                  <div className="w-1/2 flex justify-between h-full">
                    <div className="ml-auto text-right">
                      <div>
                        <span className="block font-bold">{item.name}</span>
                        <span>顏色: {item.color}</span>
                        <span>尺寸: {item.size}</span>
                      </div>
                      <div>
                        <span>${item.price}</span>
                        <p>
                          數量:
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                item.color,
                                item.size,
                                item.quantity - 1
                              )
                            }
                          >
                            -
                          </button>
                          {item.quantity}
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                item.color,
                                item.size,
                                item.quantity + 1
                              )
                            }
                          >
                            +
                          </button>
                        </p>
                        <button
                          onClick={() =>
                            removeFromCart(item.id, item.color, item.size)
                          }
                          className="text-red-500"
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="w-full text-left mt-3 pl-9 bottom-0 left-0 py-2">
            <p className="text-[18px] font-bold text-right pr-5">
              訂單總金額: ${totalPrice}
            </p>
          </div>

          <form className="p-4 flex justify-center pt-10">
            <Link
              href="/Cart"
              target="_blank"
              type="submit"
              className="group relative inline-flex h-12 items-center rounded-full justify-center overflow-hidden bg-[#59a682] border-2 border-gray-400 px-6 font-medium text-white duration-500"
            >
              <div className="relative inline-flex -translate-x-0 items-center transition group-hover:-translate-x-6">
                <div className="absolute translate-x-0 opacity-100 transition group-hover:-translate-x-6 group-hover:opacity-0">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                  >
                    <path d="M7.22303 0.665992C7.32551 0.419604 7.67454 0.419604 7.77702 0.665992L9.41343 4.60039C9.45663 4.70426 9.55432 4.77523 9.66645 4.78422L13.914 5.12475C14.18 5.14607 14.2878 5.47802 14.0852 5.65162L10.849 8.42374C10.7636 8.49692 10.7263 8.61176 10.7524 8.72118L11.7411 12.866C11.803 13.1256 11.5206 13.3308 11.2929 13.1917L7.6564 10.9705C7.5604 10.9119 7.43965 10.9119 7.34365 10.9705L3.70718 13.1917C3.47945 13.3308 3.19708 13.1256 3.25899 12.866L4.24769 8.72118C4.2738 8.61176 4.23648 8.49692 4.15105 8.42374L0.914889 5.65162C0.712228 5.47802 0.820086 5.14607 1.08608 5.12475L5.33364 4.78422C5.44576 4.77523 5.54345 4.70426 5.58665 4.60039L7.22303 0.665992Z" />
                  </svg>
                </div>
              </div>
              <span className="group-hover:translate-x-6 text-white font-semibold text-sm">
                結帳
              </span>
            </Link>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Sidebar;
