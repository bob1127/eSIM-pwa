"use client";
// import styles from "./page.module.scss";
import { useEffect, useState } from "react";
// import { AnimatePresence } from "framer-motion";
// import Preloader from "../components/toys05/Preloader";
import Layout from "./Layout.js";
import Link from "next/link";

// import SidebarNav from "../components/Sidebar.js";
// import Landing from "../components/toys05/Landing";
// import Projects from "../components/toys05/Projects";
// import Description from "../components/toys05/Description";
// import Link from "next/link";
import Example from "../components/Drag/Example.jsx";
// import HeroSlider from "../components/HeroSlider/page";
// import Marquee from "react-fast-marquee";
import Tabs from "../components/ui/Tabs.jsx";
import EmblaCarousel from "../components/EmblaCarouselToys/index.jsx";
import PopupAd from "../components/PopupAd.jsx";
// import Double from "../components/two-colum/Double.jsx";

import SwiperCard from "../components/SwiperCarousel/SwiperCardTravel.jsx";
import SwiperCarouselHero from "../components/SwiperCarouselFood/index.jsx";
// import {
//   Dropdown,
//   DropdownTrigger,
//   DropdownMenu,
//   DropdownItem,
//   Button,
// } from "@nextui-org/react";
import { Typewriter } from "react-simple-typewriter";
import ShiftTime from "../components/ShiftingCountdown/index.jsx";
// import VideoComponent from '../components/VideoComponents/VideoComponent.jsx'
// import SmoothParallaxScroll from "../components/SmoothParallaxScroll/index.js";
import { Parallax } from "react-parallax";
// import SwiperCarousel from "../components/SwiperCarousel/SwiperCardAbout.jsx";
// import SwiperCarousel01 from "../components/SwiperCarousel/SwiperCard.jsx";
// import SwiperCarousel02 from "../components/SwiperCarousel/SwiperCardFood.jsx";
import DragCarousel from "../components/DragCarousel/index.tsx";
// import JsonLd from "../components/JsonLd.jsx";
// import YoutubeUH1 from "../components/VideoPlayer/UH1.jsx";
// import TabMenu from "../components/SVGtext.jsx";
// import ParallaxImage from "../components/ParallaxImage/page.jsx";
// import { ReactLenis } from "@studio-freight/react-lenis";

// import Magnetic from "../../../common/Magnetic";
// import Rounded from "../../../common/RoundedButton";
// import SlidingImages from "../components/toys05/SlidingImages";
// import Contact from "../components/toys05/Contact";
import Image from "next/image";
// import { Link } from "lucide-react";

export default function Home() {
  return (
    <Layout>
      <div className="bg-[#e0d5c8] px-4 md:px-10">
        <div className="w-full xl:w-[800px] pt-[200px] mx-auto">
          <Image
            src="/images/size.webp"
            placeholder="empty"
            loading="lazy"
            alt="size-chart"
            width={800}
            height={1400}
          ></Image>
        </div>
      </div>
    </Layout>
  );
}
