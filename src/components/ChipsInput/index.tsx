import React, { useState, useEffect } from "react";

import "./style.css";

interface ChipsInputProps {
  value: string;
  onChange: (value: string) => void;
}

function splitTags(rawTags: string): string[] {
  const storage = {
    quoteOpen: false,
    quoteType: '"',
    currentWord: "",
  };

  const tags = [] as string[];

  for (let i = 0; i < rawTags.length; i++) {
    const char     = rawTags[i];
    const prevChar = rawTags[i - 1] === ",";

    if (storage.quoteOpen) {
      if (char === storage.quoteType) {
        storage.quoteOpen = false;
      }
    } else if (char.match(/\'|\"/)) {
      storage.quoteOpen = true;
      storage.quoteType = char;
    }

    if (!storage.quoteOpen && char === "," && !prevChar) {
      tags.push(storage.currentWord.trim());

      storage.currentWord = "";
    } else if (!storage.quoteOpen && char === "," && prevChar) {
      storage.currentWord = "";
    } else {
      storage.currentWord += char;
    }
  }

  if (storage.currentWord.length > 0) {
    tags.push(storage.currentWord.trim());
  }

  return tags;
}

function ChipsInput(props: ChipsInputProps) {
  const [ forRemove, setForRemove               ] = useState<Set<string>>(new Set());
  const [ newValue, setNewValue                 ] = useState<string>("");
  const [ showWarning, setShowWarning           ] = useState<boolean>(false);
  const [ valuesArr, setValuesArr               ] = useState<string[]>([]);
  const [ isRightMouseDown, setIsRightMouseDown ] = useState<boolean>(false);
  const [ hovered, setHovered                   ] = useState<{ startX: number; startY: number }>({
    startX: 0,
    startY: 0,
  });

  const { value, onChange } = props;

  const rightButtonDownListener = (event?: MouseEvent): void => {
    if (event?.button === 1) {
      setHovered({ startX: event.clientX, startY: event.clientY });
      setIsRightMouseDown(true);
    }
  };

  const rightButtonUpListener = (event?: MouseEvent): void => {
    event ||= window.event as MouseEvent;

    if (isRightMouseDown) {
      setIsRightMouseDown(false);

      const { startX, startY } = hovered;
      const endX = event.clientX;
      const endY = event.clientY;

      const sX = startX > endX ? endX : startX;
      const eX = startX > endX ? startX : endX;
      const sY = startY > endY ? endY : startY;
      const eY = startY > endY ? startY : endY;

      const isInSquare = (rect: DOMRect): boolean => {
        return (
          ((rect.left > sX && rect.left < eX) ||
            (rect.right > sX && rect.right < eX)) &&
          ((rect.top > sY && rect.top < eY) ||
            (rect.bottom > sY && rect.bottom < eY))
        );
      };

      const children = Array.from(
        document.getElementsByClassName("chip")
      ) as HTMLDivElement[];
      const removed = new Set() as Set<string>;

      children.forEach((child) => {
        const value = (child.firstChild as HTMLInputElement).value;

        if (isInSquare(child.getBoundingClientRect())) {
          removed.add(value);
        }
      });

      setForRemove(removed);
    }
  };

  const keyDownListener = (event: KeyboardEvent) => {
    if (event.keyCode == 8 || event.keyCode == 46) 
    {
      const tags = [ ...valuesArr.filter( (a) => !forRemove.delete(a) ) ];
      
      setValuesArr(tags);
      saveEditValues(tags);
      setForRemove(new Set());
    }
  };

  useEffect(() => {
    window.addEventListener("mousedown", rightButtonDownListener);
    window.addEventListener("mouseup", rightButtonUpListener);
    window.addEventListener("keydown", keyDownListener);

    return () => {
      window.removeEventListener("mousedown", rightButtonDownListener);
      window.removeEventListener("mouseup", rightButtonUpListener);
      window.removeEventListener("keydown", keyDownListener);
    };
  }, [ isRightMouseDown ]);

  useEffect(() => {
    if (value.length > 0) {
      setValuesArr(splitTags(value));
    }
  }, [ value.length ]);

  const renderChips = (value: string, id: number) => {
    const newArr      = [...valuesArr];
    const filteredArr = removeValue(newArr, id);
   
    return (
      <div key={id} className={ forRemove.has(value) ? "chip hoverChip" : "chip" }>
        <input
          type="text"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value.replace(/\s+/g, "");

            if (value.length === 0) {
              setValuesArr(filteredArr);
              saveEditValues(filteredArr);
            } else {
              newArr[id] = value;

              setValuesArr(newArr);
            }
          }}
          onBlur={() => {
            newArr[id] = value.replace(/,\s*$/, "").replace(/,,/, ",");

            saveEditValues(valuesArr);
          }}
        />
        <button
          className="btn"
          onClick={() => {
            setValuesArr(filteredArr);
            saveEditValues(filteredArr);
          }}
        >
          x
        </button>
      </div>
    );
  };

  const onChangeInput = (value: string): void => {
    const isComma: boolean = /,/.test(value);
    const isQuote: boolean = /"+/.test(value);

    if (isQuote) {
      convertQuote(value);
    } else if (isComma) {
      convertComma(value);
    } else {
      setNewValue(value);
    }
  };

  const convertQuote = (value: string): void => {
    const isQuotes: boolean = /".+",/g.test(value);

    if (isQuotes) {
      const newValue = removeEndComma(value);

      saveValues(newValue);
      setNewValue("");
    } else {
      setNewValue(value);
    }
  };

  const convertComma = (value: string): void => {
    if (value.length > 1) {
      const newValue = removeComma(value);

      saveValues(newValue);
      setNewValue("");
    } else if (value.length === 1) {
      setNewValue("");
    } else {
      setNewValue(value);
    }
  };

  const removeComma = (value: string): string => {
    return value.replace(/,/g, "");
  };

  const removeEndComma = (value: string): string => {
    return value.replace(/\w+,$/, "");
  };

  const handleBlur = (value: string): void => {
    const isQuote: boolean = /".+/g.test(value);
    const isQuotes: boolean = /".+"/g.test(value);

    if (isQuote && !isQuotes) {
      setShowWarning(true);
    } else {
      value.length > 0 && saveValues(value);
      setNewValue("");
      setShowWarning(false);
    }
  };

  const saveValues = (newValue: string): void => {
    if (value.length === 0) {
      onChange(newValue);
    } else {
      onChange(value + "," + newValue);
    }
  };

  const removeValue = (arr: string[], id: number): string[] => {
    return arr.filter((_, idx) => idx !== id);
  };

  const saveEditValues = (arr: string[]): void => {
    onChange(arr.toString());
  };

  return (
    <div className="ChipsInput">
      {valuesArr && valuesArr.map((value, id) => renderChips(value, id))}
      <input
        type="text"
        value={newValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChangeInput(e.target.value)
        }
        onBlur={() => handleBlur(newValue)}
      />
      {showWarning && <p>Закройте кавычки с двух сторон</p>}
    </div>
  );
}

export default ChipsInput;
