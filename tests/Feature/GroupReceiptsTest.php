<?php

namespace Tests\Feature;

use App\Events\GroupMessageStatusUpdated;
use App\Models\Group;
use App\Models\GroupMember;
use App\Models\GroupMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class GroupReceiptsTest extends TestCase
{
    use RefreshDatabase;

    protected User $user1;
    protected User $user2;
    protected User $user3;
    protected Group $group;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user1 = User::factory()->create(['username' => 'alice', 'display_name' => 'Alice']);
        $this->user2 = User::factory()->create(['username' => 'bob', 'display_name' => 'Bob']);
        $this->user3 = User::factory()->create(['username' => 'charlie', 'display_name' => 'Charlie']);

        $this->group = Group::create([
            'name'       => 'Test Group',
            'created_by' => $this->user1->id,
            'group_key'  => bin2hex(random_bytes(32)),
        ]);

        GroupMember::create(['group_id' => $this->group->id, 'user_id' => $this->user1->id, 'role' => 'admin']);
        GroupMember::create(['group_id' => $this->group->id, 'user_id' => $this->user2->id, 'role' => 'member']);
        GroupMember::create(['group_id' => $this->group->id, 'user_id' => $this->user3->id, 'role' => 'member']);
    }

    public function test_group_message_status_lifecycle(): void
    {
        Event::fake([GroupMessageStatusUpdated::class]);

        $uuid = (string) \Illuminate\Support\Str::uuid();

        // 1. User 1 sends message
        $sendRes = $this->actingAs($this->user1, 'sanctum')
            ->postJson("/api/groups/{$this->group->id}/messages", [
                'client_uuid' => $uuid,
                'body'        => 'Halo semua!',
            ]);
        $sendRes->assertStatus(201);

        // Check pending messages from server: status should be 'sent'
        $listRes = $this->actingAs($this->user1, 'sanctum')
            ->getJson("/api/groups/{$this->group->id}/messages");
        $listRes->assertStatus(200);
        $msgs = $listRes->json();
        $this->assertCount(1, $msgs);
        $this->assertEquals('sent', $msgs[0]['status']);

        // 2. User 2 acknowledges delivery
        $ackRes1 = $this->actingAs($this->user2, 'sanctum')
            ->postJson("/api/groups/{$this->group->id}/messages/ack", [
                'status'       => 'delivered',
                'client_uuids' => [$uuid],
            ]);
        $ackRes1->assertStatus(200);

        // Still in database because User 3 hasn't delivered yet
        $this->assertDatabaseHas('group_messages', [
            'client_uuid' => $uuid,
        ]);

        // 3. User 3 acknowledges delivery -> all members delivered -> status should be 'delivered' (ceklis 2)
        $ackRes2 = $this->actingAs($this->user3, 'sanctum')
            ->postJson("/api/groups/{$this->group->id}/messages/ack", [
                'status'       => 'delivered',
                'client_uuids' => [$uuid],
            ]);
        $ackRes2->assertStatus(200);

        // Broadcast sent to sender as 'delivered' (ceklis 2)
        Event::assertDispatched(GroupMessageStatusUpdated::class, function ($event) use ($uuid) {
            return $event->clientUuid === $uuid && $event->status === 'delivered';
        });

        // Store-and-Forward Ephemeral Architecture: message is deleted from MySQL so database does not pile up!
        $this->assertDatabaseMissing('group_messages', [
            'client_uuid' => $uuid,
        ]);

        // 4. User 2 reads message
        $readRes1 = $this->actingAs($this->user2, 'sanctum')
            ->postJson("/api/groups/{$this->group->id}/messages/ack", [
                'status'       => 'read',
                'client_uuids' => [$uuid],
            ]);
        $readRes1->assertStatus(200);

        // 5. User 3 reads message -> all members read -> status should be 'read' (eye icon)
        $readRes2 = $this->actingAs($this->user3, 'sanctum')
            ->postJson("/api/groups/{$this->group->id}/messages/ack", [
                'status'       => 'read',
                'client_uuids' => [$uuid],
            ]);
        $readRes2->assertStatus(200);

        // Broadcast sent to sender as 'read' (eye icon)
        Event::assertDispatched(GroupMessageStatusUpdated::class, function ($event) use ($uuid) {
            return $event->clientUuid === $uuid && $event->status === 'read';
        });

        // Receipts are completely purged from MySQL once everyone has read
        $this->assertDatabaseMissing('group_message_receipts', [
            'client_uuid' => $uuid,
        ]);
    }
}
