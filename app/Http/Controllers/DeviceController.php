<?php

namespace App\Http\Controllers;

use App\Models\Device;
use Illuminate\Http\Request;

class DeviceController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'fcm_token' => 'required|string',
        ]);

        $device = Device::updateOrCreate(
            ['fcm_token' => $data['fcm_token']],
            ['user_id' => $request->user()->id]
        );

        return response()->json($device);
    }
}
