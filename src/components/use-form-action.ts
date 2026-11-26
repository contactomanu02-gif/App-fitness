"use client";
import { useActionState, useTransition, type FormEvent } from "react";

/**
 * Como useActionState, pero sin el reseteo automático del formulario que hace React
 * al terminar una acción: si hay un error de validación, lo que el usuario cargó queda.
 */
export function useFormAction<S>(action: (state: S | undefined, form: FormData) => Promise<S | undefined>) {
  const [state, dispatch, actionPending] = useActionState<S | undefined, FormData>(action, undefined);
  const [transitionPending, start] = useTransition();
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    start(() => dispatch(form));
  };
  return { state, onSubmit, pending: actionPending || transitionPending };
}
