import React from "react";
import EmblaCarousel from "./EmblaCarousel";
import Header from "./Header";
import Footer from "./Footer";

const OPTIONS = { dragFree: true, loop: true };

// Define an array of slide objects with iframe content
const SLIDES = [
  {
    image: "/images/blog/25a98b84fad67fb841206a372f7ad78e.jpg",
    title: "Fourth Slide",
    description: "Description for the fourth slide.",
  },
  {
    image: "/images/blog/9085c7667bb4a404dacd4e5001557fc8.jpg",
    title: "Third Slide",
    description: "Description for the third slide.",
  },
  {
    image: "/images/blog/03c1c69e60c055c532de164f1dec9122.jpg",
    title: "Third Slide",
    description: "Description for the third slide.",
  },
  {
    image: "/images/blog/bb302fdcf80de8468a324fac44900180.jpg",
    title: "Fourth Slide",
    description: "Description for the fourth slide.",
  },
  {
    image: "/images/blog/4f6bb38e08ca6a6729d3c626ad9acde3.jpg",
    title: "Fifth Slide",
    description: "Description for the fifth slide.",
  },
  {
    image: "/images/blog/599e04ad5239acf6ff1811a995e70e06.jpg",
    title: "Fourth Slide",
    description: "Description for the fourth slide.",
  },
  {
    image: "/images/blog/e0a188c1f87c88f8aaba875ce0b577c9.jpg",
    title: "Third Slide",
    description: "Description for the third slide.",
  },
];

const App = () => (
  <>
    {/* Uncomment the lines below if you have header and footer components */}
    {/* <Header /> */}
    <EmblaCarousel slides={SLIDES} options={OPTIONS} />
    {/* <Footer /> */}
  </>
);

export default App;
