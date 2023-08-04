import React, { useState, createContext, useContext } from "react";
import "./styles.css";

const initialValues = {
  userName: "",
  password: "",
  passwordConfirm: "",
};
type Values = typeof initialValues;
type InputName = keyof Values;

export interface FormProviderArgs {
  children: React.ReactNode;
}

// Without getting more complex this pattern isn't very scalable, zod or yup
// would be better suited here. I'm just having having fun.
enum Validations {
  REQUIRED = "REQUIRED",
  MIN_5 = "MIN_5",
  PASSWORD = "PASSWORD",
  PASSWORD_MATCH = "PASSWORD_MATCH",
}

// I would usually use Formik/yup or react-hook-form/zod
const validations = {
  userName: [Validations.REQUIRED, Validations.MIN_5],
  password: [Validations.PASSWORD],
  passwordConfirm: [Validations.PASSWORD_MATCH],
};

const validationFunctions = {
  [Validations.REQUIRED]: (value: string) => {
    if (!value) {
      return "Field is Required.";
    }
  },
  [Validations.MIN_5]: (value: string) => {
    if (value.length < 5) {
      return "Needs to be atleast 5 characters long.";
    }
  },
  [Validations.PASSWORD]: (value: string, values: Values) => {
    if (!value.includes("password") || !value.includes(values.userName)) {
      return "To be super secure, your password must include 'password' and your userName";
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  [Validations.PASSWORD_MATCH]: (value: string, values: Values) => {
    if (
      values.password &&
      values.passwordConfirm &&
      values.password !== values.passwordConfirm
    ) {
      return "Passwords need to match.";
    }
  },
};

const runValidations = ({
  values,
  touched,
  validations,
  currentField,
}: {
  values: Values;
  touched: Record<InputName, boolean>;
  validations: Record<InputName, Validations[]>;
  currentField?: InputName | "ALL";
}) => {
  let errors: Record<InputName, string[] | null> = {
    userName: null,
    password: null,
    passwordConfirm: null,
  };

  (Object.entries(validations) as [InputName, Validations[]][]).forEach(
    ([fieldName, validations]) => {
      const isTouched = touched[fieldName];
      if (!isTouched && ![fieldName, "ALL"].includes(currentField ?? ""))
        return;
      if (!validations.length) return;
      const fieldValue = values[fieldName];
      const fieldErrors = validations
        .map((validationName) =>
          validationFunctions[validationName](fieldValue, values)
        )
        .filter(Boolean);
      if (fieldErrors.length) {
        errors = { ...errors, [fieldName]: fieldErrors };
      }
    }
  );
  return errors;
};

// If I had time and was building out a legit form without using a prebuilt lib
// like formik or react form hooks I would love to figure out how to add generics
// on a react context
export interface FormContextValues {
  values: Values;
  // TODO: set better type for value
  setValue: (newValue: { name: InputName; value: string }) => void;
  touched: Record<InputName, boolean>;
  setTouched: (newTouched: { name: InputName; isTouched?: boolean }) => void;
  errors: Record<InputName, string[] | null>;
  validateForm: (
    currentField?: InputName | "ALL"
  ) => FormContextValues["errors"];
  isSubmitting: boolean;
  submitForm: (e: React.FormEvent) => void;
}

const FormContext = createContext<FormContextValues | Record<string, never>>(
  {}
);

const FormProvider = ({ children }: FormProviderArgs): JSX.Element => {
  const [values, setValues] = useState(initialValues);
  const handleSetValue: FormContextValues["setValue"] = ({ name, value }) => {
    // To support nested values in the values object I'd need to do a deep merge here
    // But for this code challenge I am going to pretend that use case doesn't exist
    setValues({ ...values, [name]: value });
  };

  const [touched, setTouched] = useState<FormContextValues["touched"]>(
    Object.fromEntries(
      (Object.keys(initialValues) as [InputName]).map((key) => [
        key,
        false,
      ]) as [InputName, boolean][]
    ) as FormContextValues["touched"]
  );
  const handleSetTouched: FormContextValues["setTouched"] = ({
    name,
    isTouched = true,
  }) => {
    setTouched({ ...touched, [name]: isTouched });
  };

  const [errors, setErrors] = useState<FormContextValues["errors"]>(
    Object.fromEntries(
      (Object.keys(initialValues) as [InputName]).map((key) => [key, null]) as [
        InputName,
        null
      ][]
    ) as FormContextValues["errors"]
  );

  const validateForm: FormContextValues["validateForm"] = (currentField) => {
    const errors = runValidations({
      values,
      touched,
      validations,
      currentField,
    });
    setErrors(errors);
    return errors;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmitForm = (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validateForm("ALL");
    if (!Object.values(errors).some((fieldErrors) => fieldErrors?.length)) {
      setIsSubmitting(true);
      setTimeout(() => {
        alert("Username Created succesfully in the void");
        setIsSubmitting(false);
      }, 1000);
    } else {
      setTouched(
        Object.fromEntries(
          (Object.keys(initialValues) as [InputName]).map((key) => [
            key,
            true,
          ]) as [InputName, boolean][]
        ) as FormContextValues["touched"]
      );
    }
  };

  return (
    <FormContext.Provider
      value={{
        values,
        setValue: handleSetValue,
        touched,
        setTouched: handleSetTouched,
        errors,
        validateForm,
        isSubmitting,
        submitForm: handleSubmitForm,
      }}
    >
      {children}
    </FormContext.Provider>
  );
};

export const useForm = () => useContext(FormContext);

const Input = ({
  name,
  label,
  type,
}: {
  name: InputName;
  label: string;
  type?: React.HTMLInputTypeAttribute;
}) => {
  const {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setTouched,
    validateForm,
  } = useForm();
  const isTouched = touched[name];
  const fieldErrors = errors[name] ?? [];

  return (
    <div className="input">
      <label htmlFor={name}>{label}</label>
      <input
        name={name}
        value={values[name]}
        onChange={(event) => setValue({ name, value: event.target.value })}
        onBlur={() => {
          setTouched({ name });
          validateForm(name);
        }}
        type={type}
        disabled={isSubmitting}
      />
      {isTouched &&
        !!fieldErrors.length &&
        fieldErrors.map((error, i) => (
          <span key={i} className="error">
            {error}
          </span>
        ))}
    </div>
  );
};

const Form = () => {
  const { submitForm, isSubmitting } = useForm();
  return (
    <form className="card" onSubmit={submitForm}>
      <h1>Sign up</h1>
      <Input name="userName" label="Username" />
      <Input name="password" label="Password" type="password" />
      <Input name="passwordConfirm" label="Confirm Password" type="password" />
      <button type="submit" disabled={isSubmitting}>
        Create User
      </button>
    </form>
  );
};

export default function App() {
  return (
    <FormProvider>
      <Form />
    </FormProvider>
  );
}
