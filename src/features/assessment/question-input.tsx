import type { Question } from "@/clinical/schema/bundle"
import type { AnswerValue } from "@/clinical/engine/types"

import { View } from "react-native"

import { ScalePicker } from "@/components/ui/scale-picker"
import { OptionRow } from "@/features/assessment/option-row"

type QuestionInputProps = {
  /** Any question except a body map, which has its own screen. */
  question: Exclude<Question, { type: "body-map" }>
  value: AnswerValue | undefined
  onChange: (value: AnswerValue) => void
}

/** The answer control for a question, by type. */
function QuestionInput({ question, value, onChange }: QuestionInputProps) {
  switch (question.type) {
    case "yes-no":
      return (
        <View role="radiogroup" className="gap-3">
          <OptionRow kind="radio" label="Yes" selected={value === true} onPress={() => onChange(true)} />
          <OptionRow kind="radio" label="No" selected={value === false} onPress={() => onChange(false)} />
        </View>
      )
    case "single":
      return (
        <View role="radiogroup" className="gap-3">
          {question.options.map(option => (
            <OptionRow key={option.id} kind="radio" label={option.label} selected={value === option.id} onPress={() => onChange(option.id)} />
          ))}
        </View>
      )
    case "multi": {
      const selected = Array.isArray(value)
        ? value
        : []
      return (
        <View className="gap-3">
          {question.options.map(option => (
            <OptionRow
              key={option.id}
              kind="checkbox"
              label={option.label}
              selected={selected.includes(option.id)}
              onPress={() => onChange(selected.includes(option.id)
                ? selected.filter(id => id !== option.id)
                : [...selected, option.id])}
            />
          ))}
        </View>
      )
    }
    case "scale":
      return (
        <ScalePicker
          min={question.min}
          max={question.max}
          minLabel={question.minLabel}
          maxLabel={question.maxLabel}
          value={typeof value === "number"
            ? value
            : undefined}
          onChange={onChange}
          accessibilityLabel={question.prompt}
        />
      )
  }
}

export {
  QuestionInput,
  type QuestionInputProps,
}
