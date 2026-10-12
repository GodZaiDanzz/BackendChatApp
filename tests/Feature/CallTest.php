<?php

namespace Tests\Feature;

use App\Events\CallAccepted;
use App\Events\CallEnded;
use App\Events\CallRejected;
use App\Events\CallSignal;
use App\Events\IncomingCall;
use App\Models\Call;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CallTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_get_ice_servers(): void
    {
        config([
            'services.turn.url'    => 'turn:turn.example.com:3478',
            'services.turn.secret' => 'supersecretturnkey',
        ]);

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/calls/ice-servers');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'ice_servers',
                'iceServers',
            ]);

        $servers = $response->json('ice_servers');
        $this->assertCount(2, $servers);
        $this->assertEquals('stun:stun.l.google.com:19302', $servers[0]['urls']);

        // Check TURN credential generation
        $turnServer = $servers[1];
        $this->assertEquals('turn:turn.example.com:3478', $turnServer['urls']);
        $this->assertStringContainsString(":{$user->id}", $turnServer['username']);
        $this->assertNotEmpty($turnServer['credential']);
    }

    public function test_can_initiate_call_and_dispatches_events(): void
    {
        Event::fake([IncomingCall::class]);

        $caller = User::factory()->create();
        $callee = User::factory()->create();

        Sanctum::actingAs($caller);

        $response = $this->postJson('/api/calls', [
            'callee_id' => $callee->id,
            'type'      => 'audio',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('call.status', 'ringing')
            ->assertJsonPath('call.caller_id', $caller->id)
            ->assertJsonPath('call.callee_id', $callee->id);

        $callId = $response->json('call.id');
        $this->assertDatabaseHas('calls', [
            'id'        => $callId,
            'caller_id' => $caller->id,
            'callee_id' => $callee->id,
            'status'    => 'ringing',
        ]);

        Event::assertDispatched(IncomingCall::class, function ($event) use ($callee, $callId) {
            return $event->call->id === $callId && (int) $event->call->callee_id === (int) $callee->id;
        });
    }

    public function test_cannot_call_self(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/calls', [
            'callee_id' => $user->id,
            'type'      => 'audio',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['callee_id']);
    }

    public function test_callee_is_busy_if_already_in_call(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        $userC = User::factory()->create();

        // User A and User B have an active ringing call
        Call::create([
            'caller_id'  => $userA->id,
            'callee_id'  => $userB->id,
            'status'     => 'ringing',
            'type'       => 'audio',
            'started_at' => now(),
        ]);

        // User C tries to call User B
        Sanctum::actingAs($userC);
        $response = $this->postJson('/api/calls', [
            'callee_id' => $userB->id,
            'type'      => 'audio',
        ]);

        $response->assertStatus(409)
            ->assertJsonPath('call.status', 'busy');

        $this->assertDatabaseHas('calls', [
            'caller_id' => $userC->id,
            'callee_id' => $userB->id,
            'status'    => 'busy',
        ]);
    }

    public function test_callee_can_accept_call(): void
    {
        Event::fake([CallAccepted::class]);

        $caller = User::factory()->create();
        $callee = User::factory()->create();

        $call = Call::create([
            'caller_id'  => $caller->id,
            'callee_id'  => $callee->id,
            'status'     => 'ringing',
            'type'       => 'audio',
            'started_at' => now(),
        ]);

        Sanctum::actingAs($callee);
        $response = $this->postJson("/api/calls/{$call->id}/accept");

        $response->assertStatus(200)
            ->assertJsonPath('call.status', 'accepted');

        $this->assertDatabaseHas('calls', [
            'id'     => $call->id,
            'status' => 'accepted',
        ]);

        Event::assertDispatched(CallAccepted::class, function ($event) use ($call) {
            return $event->call->id === $call->id;
        });
    }

    public function test_caller_or_stranger_cannot_accept_call(): void
    {
        $caller = User::factory()->create();
        $callee = User::factory()->create();
        $stranger = User::factory()->create();

        $call = Call::create([
            'caller_id'  => $caller->id,
            'callee_id'  => $callee->id,
            'status'     => 'ringing',
            'type'       => 'audio',
            'started_at' => now(),
        ]);

        // Caller cannot accept
        Sanctum::actingAs($caller);
        $this->postJson("/api/calls/{$call->id}/accept")->assertStatus(403);

        // Stranger cannot accept
        Sanctum::actingAs($stranger);
        $this->postJson("/api/calls/{$call->id}/accept")->assertStatus(403);
    }

    public function test_callee_can_reject_call(): void
    {
        Event::fake([CallRejected::class]);

        $caller = User::factory()->create();
        $callee = User::factory()->create();

        $call = Call::create([
            'caller_id'  => $caller->id,
            'callee_id'  => $callee->id,
            'status'     => 'ringing',
            'type'       => 'audio',
            'started_at' => now(),
        ]);

        Sanctum::actingAs($callee);
        $response = $this->postJson("/api/calls/{$call->id}/reject");

        $response->assertStatus(200)
            ->assertJsonPath('call.status', 'rejected');

        $this->assertDatabaseHas('calls', [
            'id'     => $call->id,
            'status' => 'rejected',
        ]);

        Event::assertDispatched(CallRejected::class);
    }

    public function test_stranger_cannot_reject_call(): void
    {
        $caller = User::factory()->create();
        $callee = User::factory()->create();
        $stranger = User::factory()->create();

        $call = Call::create([
            'caller_id'  => $caller->id,
            'callee_id'  => $callee->id,
            'status'     => 'ringing',
            'type'       => 'audio',
            'started_at' => now(),
        ]);

        Sanctum::actingAs($stranger);
        $this->postJson("/api/calls/{$call->id}/reject")->assertStatus(403);
    }

    public function test_participant_can_end_call(): void
    {
        Event::fake([CallEnded::class]);

        $caller = User::factory()->create();
        $callee = User::factory()->create();

        $call = Call::create([
            'caller_id'  => $caller->id,
            'callee_id'  => $callee->id,
            'status'     => 'accepted',
            'type'       => 'audio',
            'started_at' => now(),
        ]);

        Sanctum::actingAs($caller);
        $response = $this->postJson("/api/calls/{$call->id}/end");

        $response->assertStatus(200)
            ->assertJsonPath('call.status', 'ended');

        $this->assertDatabaseHas('calls', [
            'id'     => $call->id,
            'status' => 'ended',
        ]);

        Event::assertDispatched(CallEnded::class);
    }

    public function test_stranger_cannot_end_call(): void
    {
        $caller = User::factory()->create();
        $callee = User::factory()->create();
        $stranger = User::factory()->create();

        $call = Call::create([
            'caller_id'  => $caller->id,
            'callee_id'  => $callee->id,
            'status'     => 'accepted',
            'type'       => 'audio',
            'started_at' => now(),
        ]);

        Sanctum::actingAs($stranger);
        $this->postJson("/api/calls/{$call->id}/end")->assertStatus(403);
    }

    public function test_can_send_signal_between_participants(): void
    {
        Event::fake([CallSignal::class]);

        $caller = User::factory()->create();
        $callee = User::factory()->create();
        $stranger = User::factory()->create();

        $call = Call::create([
            'caller_id'  => $caller->id,
            'callee_id'  => $callee->id,
            'status'     => 'accepted',
            'type'       => 'audio',
            'started_at' => now(),
        ]);

        Sanctum::actingAs($caller);
        $response = $this->postJson("/api/calls/{$call->id}/signal", [
            'type'    => 'offer',
            'payload' => ['sdp' => 'v=0...'],
        ]);

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        Event::assertDispatched(CallSignal::class, function ($event) use ($call, $callee, $caller) {
            return $event->call->id === $call->id
                && (int) $event->recipientId === (int) $callee->id
                && (int) $event->senderId === (int) $caller->id
                && $event->type === 'offer';
        });

        // Stranger cannot signal
        Sanctum::actingAs($stranger);
        $this->postJson("/api/calls/{$call->id}/signal", [
            'type'    => 'offer',
            'payload' => ['sdp' => '...'],
        ])->assertStatus(403);
    }

    public function test_can_get_call_history(): void
    {
        $user = User::factory()->create();
        $peer1 = User::factory()->create();
        $peer2 = User::factory()->create();

        // Call as caller
        Call::create([
            'caller_id'  => $user->id,
            'callee_id'  => $peer1->id,
            'status'     => 'ended',
            'type'       => 'audio',
            'started_at' => now()->subMinutes(10),
            'ended_at'   => now()->subMinutes(5),
        ]);

        // Call as callee
        Call::create([
            'caller_id'  => $peer2->id,
            'callee_id'  => $user->id,
            'status'     => 'missed',
            'type'       => 'video',
            'started_at' => now()->subMinutes(2),
        ]);

        Sanctum::actingAs($user);
        $response = $this->getJson('/api/calls');

        $response->assertStatus(200)
            ->assertJsonPath('total', 2)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'caller_id',
                        'callee_id',
                        'type',
                        'status',
                        'caller',
                        'callee',
                    ],
                ],
            ]);
    }

    public function test_can_update_device_token(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/device-token', [
            'fcm_token' => 'sample_fcm_token_xyz_999',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'fcm_token' => 'sample_fcm_token_xyz_999',
            ]);

        $this->assertDatabaseHas('users', [
            'id'        => $user->id,
            'fcm_token' => 'sample_fcm_token_xyz_999',
        ]);
    }
}
