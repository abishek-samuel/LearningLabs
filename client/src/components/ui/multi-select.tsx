import { Popover } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { Fragment } from "react";

interface Option {
    [key: string]: any;
}

interface MultiSelectProps {
    label: string;
    options: Option[];
    selected: Option[];
    onChange: (value: Option[]) => void;
    labelKey: string;
}

export function MultiSelect({
    label,
    options,
    selected,
    onChange,
    labelKey,
}: MultiSelectProps) {
    const handleToggle = (option: Option) => {
        const exists = selected.find((o) => o.id === option.id);
        if (exists) {
            onChange(selected.filter((o) => o.id !== option.id));
        } else {
            onChange([...selected, option]);
        }
    };

    const getTruncatedLabel = () => {
        if (selected.length > 3) {
            return selected
                .slice(0, 3)
                .map((s) => s[labelKey])
                .join(", ") + " ...";
        }
        return selected.map((s) => s[labelKey]).join(", ");
    };

    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label}
            </label>
            <Popover className="relative w-full">
                <Popover.Button className="w-full cursor-default rounded-lg border bg-white dark:bg-slate-800 py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none sm:text-sm">
                    <span
                        className="block truncate font-normal"
                        title={
                            selected.length > 3
                                ? selected.map((s) => s[labelKey]).join(", ")
                                : undefined
                        }
                    >
                        {selected.length === 0 ? "Select..." : getTruncatedLabel()}
                    </span>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                    </span>
                </Popover.Button>

                <Popover.Panel className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-md bg-white dark:bg-slate-900 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {options.length === 0 ? (
                        <li className="cursor-default select-none relative px-4 py-2 text-gray-500">
                            No data available
                        </li>
                    ) : (
                        options.map((option) => (
                            <div
                                key={option.id}
                                className={clsx(
                                    "cursor-pointer select-none relative px-4 py-2 flex items-center hover:bg-slate-100 dark:hover:bg-slate-700"
                                )}
                                onClick={() => handleToggle(option)}
                            >
                                <input
                                    type="checkbox"
                                    checked={!!selected.find((s) => s.id === option.id)}
                                    readOnly
                                    className="mr-2"
                                />
                                <span className="block truncate">{option[labelKey]}</span>
                                {selected.find((s) => s.id === option.id) && (
                                    <Check className="absolute right-3 h-4 w-4 text-green-500" />
                                )}
                            </div>
                        ))
                    )}
                </Popover.Panel>
            </Popover>
        </div>
    );
}
