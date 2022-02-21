import { useEffect } from 'react'
import get from 'lodash/get'
import set from 'lodash/set'
import isEmpty from 'lodash/isEmpty'
import {
  Control,
  FieldErrors,
  SubmitHandler,
  useFieldArray,
  useForm,
  UseFormRegister,
  UseFormWatch,
} from 'react-hook-form'
import {
  ActionFunction,
  LoaderFunction,
  useLoaderData,
  Form,
  useSubmit,
  redirect,
  useActionData,
  json,
} from 'remix'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import qs from 'qs'

const questionSchema = z.object({
  name: z.string().nonempty('Name required'),
  type: z.enum(['TEXT', 'NUMBER', 'RADIOLIST']),
  options: z
    .array(
      z.object({
        label: z.string().nonempty('Label required'),
      })
    )
    .optional(),
})

const formSchema = z.object({
  title: z.string().nonempty('Title required'),
  questions: z.array(questionSchema),
})

type FormSchemaType = z.infer<typeof formSchema>
type QuestionSchemaType = z.infer<typeof questionSchema>

export const loader: LoaderFunction = () => {
  return {
    template: {
      questions: [
        {
          name: 'What is your name?',
          type: 'TEXT',
        },
        {
          name: 'How old are you?',
          type: 'NUMBER',
        },
        {
          name: 'What is your favorite framework?',
          type: 'RADIOLIST',
        },
      ],
    },
  }
}

export const action: ActionFunction = async ({ request }) => {
  const formText = await request.text()
  const parsedForm = qs.parse(formText, {
    allowDots: true,
  })

  const validatedForm = formSchema.safeParse(parsedForm)

  if (validatedForm.success) {
    // Save to db
    return redirect('/templates/1')
  }

  return json({
    errors: validatedForm.error.issues.reduce((errors, issue) => {
      set(errors, issue.path, issue.message)
      return errors
    }, {}),
  })
}

export default function FormJson() {
  const { template } = useLoaderData()
  const actionData = useActionData()

  const {
    control,
    handleSubmit,
    register,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
  })
  const { append, fields: questions } = useFieldArray<
    FormSchemaType,
    'questions'
  >({
    control,
    name: 'questions',
  })

  const validationErrors =
    actionData?.errors && isEmpty(errors) ? actionData.errors : errors
  const submit = useSubmit()

  useEffect(() => {
    reset(actionData?.data || template)
  }, [template, actionData])

  const submitHookForm: SubmitHandler<FormSchemaType> = (values, e) => {
    submit(e?.target)
  }

  return (
    <Form method="post" onSubmit={handleSubmit(submitHookForm)}>
      <label htmlFor="title">Form Title</label>
      <input id="title" type="text" {...register('title')} />
      {validationErrors.title ? (
        <div className="error">{validationErrors.title.message}</div>
      ) : null}

      <h3>Questions</h3>
      {questions.map((q, qIndex) => (
        <div key={q.id} style={{ marginTop: 20 }}>
          <QuestionEditor
            key={q.id}
            question={q}
            index={qIndex}
            register={register}
            watch={watch}
            control={control}
            errors={validationErrors}
          />
        </div>
      ))}
      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          onClick={() =>
            append({
              name: '',
              type: 'TEXT',
              options: undefined,
            })
          }
        >
          Add Question
        </button>
      </div>

      <div style={{ marginTop: 30 }}>
        <button type="submit">Submit</button>
      </div>
    </Form>
  )
}

function QuestionEditor({
  question,
  index,
  register,
  watch,
  control,
  errors,
}: {
  question: QuestionSchemaType & { id: string }
  index: number
  register: UseFormRegister<FormSchemaType>
  watch: UseFormWatch<FormSchemaType>
  control: Control<FormSchemaType>
  errors: FieldErrors<FormSchemaType>
}) {
  const questionType = watch(`questions.${index}.type`)

  return (
    <>
      <label htmlFor={`q-${question.id}-label`}>Label</label>
      <input
        id={`q-${question.id}-label`}
        type="text"
        {...register(`questions.${index}.name`)}
      />
      {get(errors, `questions[${index}].name.message`) ? (
        <div className="error">
          {get(errors, `questions[${index}].name.message`)}
        </div>
      ) : null}

      <label htmlFor={`q-${question.id}-type`}>Type</label>
      <select
        id={`q-${question.id}-type`}
        {...register(`questions.${index}.type`)}
      >
        <option value="TEXT">Text</option>
        <option value="NUMBER">Number</option>
        <option value="RADIOLIST">Radio List</option>
      </select>

      {questionType === 'RADIOLIST' && (
        <RadioOptionEditor
          questionIndex={index}
          control={control}
          register={register}
          errors={errors}
        />
      )}
    </>
  )
}

function RadioOptionEditor({
  control,
  register,
  questionIndex,
  errors,
}: {
  control: Control<FormSchemaType>
  register: UseFormRegister<FormSchemaType>
  questionIndex: number
  errors: FieldErrors<FormSchemaType>
}) {
  const { append, fields } = useFieldArray<
    FormSchemaType,
    `questions.${typeof questionIndex}.options`
  >({
    control,
    name: `questions.${questionIndex}.options`,
  })

  return (
    <div>
      <h4>Options</h4>
      {fields.map((opt, optIndex) => (
        <div key={opt.id}>
          <input
            type="text"
            {...register(
              `questions.${questionIndex}.options.${optIndex}.label`
            )}
          />
          {get(
            errors,
            `questions[${questionIndex}].options[${optIndex}].label.message`
          ) ? (
            <div className="error">
              {get(
                errors,
                `questions[${questionIndex}].options[${optIndex}].label.message`
              )}
            </div>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          append({
            label: '',
          })
        }
      >
        Add Option
      </button>
    </div>
  )
}
