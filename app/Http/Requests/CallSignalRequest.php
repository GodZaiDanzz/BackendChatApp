<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CallSignalRequest extends FormRequest
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
            'type'    => ['required', 'string', 'in:offer,answer,ice-candidate'],
            'payload' => ['required'],
        ];
    }
}
