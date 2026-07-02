import React from "react";

interface BannerProps {
  urls: {
    large: string;
    medium: string;
    small: string;
  };
  text: string;
}

const ResponsiveBanner: React.FC<BannerProps> = ({ urls, text }) => {
  return (
    <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden">
      <picture>
        <source media="(max-width: 640px)" srcSet={urls.small} />
        <source media="(max-width: 1024px)" srcSet={urls.medium} />
        <img
          src={urls.large}
          alt="Store Banner"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </picture>

      <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-center p-3 sm:p-6">
        <h1 className="text-white text-lg sm:text-2xl md:text-4xl font-bold leading-tight max-w-[90%]">
          {text}
        </h1>
      </div>
    </div>
  );
};

export default ResponsiveBanner;
