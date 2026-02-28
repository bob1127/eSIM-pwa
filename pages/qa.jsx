"use client";
// import styles from "./page.module.scss";
import { useEffect, useState } from "react";
// import { AnimatePresence } from "framer-motion";
// import Preloader from "../components/toys05/Preloader";
import Image from "next/image";

import IntroHero from "../components/IntroHero";
import PageTransition from "../components/PageTransition.tsx";
// import { Link } from "lucide-react";
import Layout from "./Layout";
export default function Home() {
  return (
    <Layout>
      <PageTransition>
        <IntroHero />
        <div className="primary w-[100px] h-[100px]">Lorem</div>
      </PageTransition>
    </Layout>
  );
}
