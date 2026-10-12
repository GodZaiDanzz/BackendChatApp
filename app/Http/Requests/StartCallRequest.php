<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StartCallRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'callee_id' => ['required', 'integer', 'exists:users,id'],
            'type'      => ['nullable', 'string', 'in:audio,video'],
        ];
    }
}
