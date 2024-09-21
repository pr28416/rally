"use client";
import React, { useState, useRef, useEffect, createContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Card = {
  id: number;
  name: string;
  designation: string;
  content: React.ReactNode;
};

const CardStackContext = createContext<{
  shuffleToNext: () => void;
}>({ shuffleToNext: () => {} });

export const useCardStack = () => {
  const [cards, setCards] = useState<Card[]>([]);

  const shuffleToNext = useCallback(() => {
    setCards((prevCards) => {
      const [frontCard, ...restCards] = prevCards;
      return [...restCards, frontCard];
    });
  }, []);

  return { cards, setCards, shuffleToNext };
};

export const CardStack = ({
  items,
  offset,
  scaleFactor,
  cards,
  setCards,
}: {
  items: Card[];
  offset?: number;
  scaleFactor?: number;
  cards: Card[];
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
}) => {
  const CARD_OFFSET = offset || 10;
  const SCALE_FACTOR = scaleFactor || 0.06;
  const ROTATION_FACTOR = 2;
  const X_OFFSET_FACTOR = 5;
  const MIN_HEIGHT = 250;
  const [maxHeight, setMaxHeight] = useState(MIN_HEIGHT);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setCards(items);
  }, [items, setCards]);

  useEffect(() => {
    const heights = cardRefs.current.map(ref => ref?.offsetHeight || 0);
    setMaxHeight(Math.max(...heights, MIN_HEIGHT));
  }, [cards]);

  const moveToFront = (clickedIndex: number) => {
    setCards((prevCards) => {
      if (clickedIndex === 0) {
        const [frontCard, ...restCards] = prevCards;
        return [...restCards, frontCard];
      } else {
        const newCards = [...prevCards];
        const [clickedCard] = newCards.splice(clickedIndex, 1);
        return [clickedCard, ...newCards];
      }
    });
  };

  return (
    <CardStackContext.Provider value={{ shuffleToNext: () => moveToFront(0) }}>
      <div className="relative w-full max-w-lg mx-auto" style={{ height: `${maxHeight + (cards.length - 1) * CARD_OFFSET}px` }}>
        <AnimatePresence>
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              layoutId={`card-${card.id}`}
              ref={(el: HTMLDivElement | null) => { cardRefs.current[index] = el; }}
              className="absolute w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700 cursor-pointer flex flex-col"
              style={{
                transformOrigin: "top center",
                height: `${maxHeight}px`,
                overflow: 'hidden',
              }}
              animate={{
                top: index * CARD_OFFSET,
                scale: 1 - index * SCALE_FACTOR,
                zIndex: cards.length - index,
                rotate: index * ROTATION_FACTOR,
                x: index * X_OFFSET_FACTOR,
              }}
              transition={{
                duration: 0.25,
                ease: "easeInOut",
              }}
              onClick={() => moveToFront(index)}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{card.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.designation}</p>
                </div>
              </div>
              <div className="flex-grow overflow-y-auto">
                <div className="font-normal text-gray-700 dark:text-gray-300">
                  {card.content}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </CardStackContext.Provider>
  );
};